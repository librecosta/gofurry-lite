"""Build public V1 snapshots from the verified seed and selected pg_restore COPY exports."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
CUTOFF = datetime.fromisoformat('2026-11-15T17:33:22+08:00')
BACKUP = '7ecb9fd2d31f5f4246ea8a814e222dc346130962c8a3376b83edabcb5a29b65a'
STEAM_CDN = {
    'shared.akamai.steamstatic.com', 'shared.fastly.steamstatic.com',
    'shared.steamstatic.com', 'store.akamai.steamstatic.com',
}
MOVIE_POLICY = json.loads((ROOT/'scripts/steam-movie-policy.json').read_text(encoding='utf-8'))
MOVIE_FORMATS = ('mp4', 'webm', 'dash', 'hls')


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def read_ndjson(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line]


def rows(work, name):
    data = (work / f'{name}.copy').read_text(encoding='utf-8')
    block = re.search(r'^COPY public\.\w+ \(([^\n]+)\) FROM stdin;\n(.*?)^\\\.$', data, re.M | re.S)
    if not block:
        raise ValueError(f'Missing COPY block: {name}')
    columns = [column.strip('"') for column in block[1].split(', ')]
    escapes = {'n':'\n', 'r':'\r', 't':'\t', 'b':'\b', 'f':'\f', 'v':'\v', '\\':'\\'}
    return [
        dict(zip(columns, [
            None if item == r'\N' else re.sub(r'\\(.)', lambda m: escapes.get(m[1], m[1]), item)
            for item in line.split('\t')
        ], strict=True))
        for line in block[2].strip('\n').split('\n') if line
    ]


def dual(zh, en):
    return {'zh': (zh or '').strip(), 'en': (en or '').strip()}


def copy(candidate):
    return {'title': dual(candidate['name'], candidate['name_en']),
            'description': dual(candidate['info'], candidate['info_en'])}


class GameText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden = True
        if tag in ('br', 'p', 'div', 'li', 'h1', 'h2', 'h3'):
            self.parts.append('\n')
        if tag == 'li':
            self.parts.append('• ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = False
        if tag in ('p', 'div', 'ul', 'ol'):
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def readable(value):
    if not value:
        return ''
    parser = GameText()
    parser.feed(value)
    return '\n\n'.join(
        re.sub(r'\s+', ' ', line).strip()
        for line in ''.join(parser.parts).splitlines() if line.strip()
    ).strip()


def official_media(url, app_id):
    if not url:
        return None
    value = urlsplit(url)
    if value.scheme != 'https' or value.hostname not in STEAM_CDN or value.netloc != value.hostname:
        return None
    if not re.fullmatch(r'/(?:store_item_assets/)?steam/apps/' + str(app_id) + r'/[\w/.-]+\.(?:png|jpg|jpeg|webp)', value.path):
        return None
    return f'https://{value.hostname}{value.path}'


def steam_movie_url(url, app_id, media_key, kind):
    if not url or not re.fullmatch(r'https://[!-~]+', url):
        return None
    try:
        value = urlsplit(url)
    except ValueError:
        return None
    prefix = 'thumbnail' if kind == 'thumbnail' else 'video'
    extension = {'dash': 'mpd', 'hls': 'm3u8'}.get(kind, kind)
    if (value.netloc not in MOVIE_POLICY[prefix + 'Hosts'] or '#' in url or
            (value.query and not re.fullmatch(r't=[0-9]+', value.query))):
        return None
    pattern = (MOVIE_POLICY[prefix + 'Path'].replace('{appId}', str(app_id))
               .replace('{mediaKey}', media_key).replace('{format}', extension))
    if re.fullmatch(pattern, value.path):
        return f'https://{value.netloc}{value.path}'
    return None


def recover_movies(assets, legacy_media, catalog_app_ids):
    grouped = defaultdict(list)
    for asset in assets:
        if asset['asset_family'] == 'movie':
            grouped[int(asset['game_id']), asset['media_key']].append(asset)
    for media in legacy_media:
        if media['media_type'] == 'movie':
            grouped[int(media['game_id']), media['media_key']].append(media)

    def sort_order(variants):
        first = min(variants, key=lambda row: ('asset_type' not in row, int(row['sort_order'])))
        return int(first['sort_order'])

    recovered = defaultdict(list)
    audit = []
    for (game_id, key), variants in sorted(grouped.items(), key=lambda entry: (
            entry[0][0], sort_order(entry[1]), entry[0][1])):
        assert re.fullmatch(r'[1-9][0-9]*', key), (game_id, key)
        asset_rows = sorted((row for row in variants if 'asset_type' in row), key=lambda row: int(row['id']))
        media_rows = [row for row in variants if 'media_type' in row]
        app_id = catalog_app_ids.get(game_id, int(variants[0]['appid']))
        assert all(int(row['appid']) == app_id for row in variants), (game_id, key)
        title = next((row['title'].strip() for row in asset_rows + media_rows if (row['title'] or '').strip()), '')
        order = sort_order(variants)
        choices = defaultdict(list)
        rejected = set()

        def record(url, kind, priority):
            if address := steam_movie_url(url, app_id, key, kind):
                choices[kind].append((priority, address))

        for row in asset_rows:
            _, _, variant = row['asset_type'].partition('_')
            kind = variant.split('_', 1)[0]
            if kind not in (*MOVIE_FORMATS, 'thumbnail'):
                continue
            status = int(row['status_code'] or 0)
            if row['exists'] != 't' or (status and not 200 <= status < 300):
                rejected.add(steam_movie_url(row['url'], app_id, key, kind))
                continue
            record(row['url'], kind, 0 if row['asset_type'].endswith('_max') else 2)
            record(row['thumbnail_url'], 'thumbnail', 2)
        for row in media_rows:
            extra = json.loads(row['extra'] or '{}')
            record(row['thumbnail_url'], 'thumbnail', 3)
            for kind in MOVIE_FORMATS:
                record(row['url'], kind, 5)
            if str(extra.get('id', key)) != key:
                continue
            record(extra.get('thumbnail_url'), 'thumbnail', 3)
            for kind in ('mp4', 'webm'):
                record(extra.get(f'{kind}_max_url'), kind, 1)
                record(extra.get(f'{kind}_480_url'), kind, 3)
            for name in ('dash_av1', 'dash_h264', 'hls_h264'):
                record(extra.get(f'{name}_url'), name.split('_')[0], 3)

        urls = {kind: list(dict.fromkeys(address for _, address in sorted(options) if address not in rejected))
                for kind, options in choices.items()}
        formats = [kind for kind in MOVIE_FORMATS if urls.get(kind)]
        poster = next(iter(urls.get('thumbnail', [])), None)
        native = {kind: urls[kind][0] for kind in ('mp4', 'webm') if urls.get(kind)}
        if game_id not in catalog_app_ids:
            disposition = 'outside-publication'
        elif native and poster:
            disposition = 'recovered'
            recovered[game_id].append({'id': key, 'title': title, 'thumbnail': poster, **native})
        elif native:
            disposition = 'no-verified-thumbnail'
        elif 'hls' in formats or 'dash' in formats:
            disposition = 'streaming-only'
        else:
            disposition = 'no-verified-source'
        audit.append({
            'gameId': game_id, 'appId': app_id, 'mediaKey': key, 'title': title, 'sortOrder': order,
            'formats': formats, 'urls': urls, 'disposition': disposition,
            'assetEvidence': [{'assetType': row['asset_type'], 'exists': row['exists'] == 't',
                               'statusCode': int(row['status_code'] or 0), 'checkedAt': row['checked_at']}
                              for row in asset_rows],
        })
    return recovered, audit


def release_text(record):
    if not record or record['inferred'] is True:
        return {}
    source = record['precision']
    if source in ('day', 'exact', 'date') and record['exact_date']:
        return {'release': record['exact_date'], 'releasePrecision': 'date'}
    year = record['release_year']
    if not year:
        return {}
    if source == 'month' and record['release_month']:
        return {'release': f"{year}-{record['release_month']:02d}", 'releasePrecision': 'month'}
    if source == 'quarter' and record['release_quarter']:
        return {'release': f"{year} Q{record['release_quarter']}", 'releasePrecision': 'quarter'}
    if source == 'year':
        return {'release': str(year), 'releasePrecision': 'year'}
    return {}


def valid_https(url):
    if not url or any(char.isspace() or char == '\\' for char in url):
        return False
    parsed = urlsplit(url)
    return (parsed.scheme == 'https' and parsed.hostname == parsed.netloc and
            re.fullmatch(r'(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]+', parsed.hostname or '')
            and not parsed.fragment)


def active(row, start, end):
    def timestamp(value):
        if re.search(r'[+-]\d{2}$', value):
            value += ':00'
        value = re.sub(r'\.(\d+)(?=[+-])', lambda part: '.' + part[1].ljust(6, '0'), value)
        return datetime.fromisoformat(value)

    return timestamp(row[start]) <= CUTOFF and (not row[end] or CUTOFF < timestamp(row[end]))


def address_candidates(work, seed, site_ids):
    addresses = read_ndjson(seed/'content/site_addresses_candidates.ndjson')
    seed_primary = {r['raw']['id']: r['candidate'] for r in addresses
                    if r['source']['table'] == 'gfn_site_primary_target_periods'}
    targets = {row['id']: row for row in rows(work, 'gfn_target_tracking_periods')}
    domains = {row['id']: row for row in rows(work, 'gfn_collector_domain')}
    eligible = set(site_ids)
    found = {}
    for period in rows(work, 'gfn_site_primary_target_periods'):
        site_id = int(period['site_id'])
        if site_id not in eligible or not active(period, 'effective_from', 'effective_until'):
            continue
        assert site_id not in found, site_id
        target = targets[period['target_tracking_period_id']]
        domain = domains.get(target['collector_domain_id'])
        candidate = seed_primary[int(period['id'])]
        assert target['site_id'] == period['site_id'] and candidate['open_at_snapshot'], site_id
        if not active(target, 'tracked_from', 'tracked_until'):
            continue
        if not domain or domain['site_id'] != period['site_id'] or domain['deleted'] != 'f':
            continue
        url = candidate['url']
        configured = (domain['prefix'] or '') + domain['name']
        configured_url = urlsplit(configured if '://' in configured else '//' + configured)
        tracked = target['target']
        tracked_url = urlsplit(tracked if '://' in tracked else '//' + tracked)
        if (url and urlsplit(url).hostname == configured_url.hostname == tracked_url.hostname and
                urlsplit(url).path.rstrip('/') == tracked_url.path.rstrip('/')):
            found[site_id] = url
    return found


def curated(name):
    return json.loads((ROOT/'content/curation'/name).read_text(encoding='utf-8'))


def main(work):
    seed = work / 'seed'
    manifest = json.loads((seed / 'manifest.json').read_text(encoding='utf-8'))
    assert manifest['snapshot_id'] == 'legacy-20261115' and manifest['backup_sha256'] == BACKUP
    for line in (seed / 'SHA256SUMS').read_text(encoding='utf-8').splitlines():
        checksum, filename = line.split('  ', 1)
        assert sha256((seed / filename).read_bytes()).hexdigest() == checksum, filename

    def source(name):
        return read_ndjson(seed / 'content' / f'{name}.ndjson')

    old_sites = {r['raw']['id']:r for r in source('sites')}
    dump_sites = {int(r['id']):r for r in rows(work, 'gfn_site')}
    assert set(dump_sites) == set(old_sites) and len(old_sites) == 247
    assert all((row['raw']['deleted'] is True) == (dump_sites[i]['deleted']=='t')
               and str(row['raw']['nsfw']) == dump_sites[i]['nsfw'] for i,row in old_sites.items())
    deleted = sorted(i for i,row in dump_sites.items() if row['deleted'] == 't')
    adult_sites = {i for i,row in dump_sites.items() if row['deleted'] == 'f' and row['nsfw'] == '1'}
    eligible_sites = sorted(set(dump_sites)-set(deleted))
    assert (len(deleted),len(adult_sites),len(eligible_sites)) == (22,28,225)
    ratings = curated('content-ratings.json')
    site_ratings = {i:ratings['sites'].get(str(i),'nsfw' if i in adult_sites else 'sfw') for i in eligible_sites}
    assert Counter(site_ratings.values()) == {'sfw':197,'nsfw':28}
    approved = curated('site-link-review.json')
    snapshot_urls = address_candidates(work, seed, eligible_sites)
    site_links = {i:snapshot_urls[i] for i in approved['verifiedSnapshotIds']}
    assert not set(site_links) & {int(i) for i in approved['verifiedOverrides']}
    site_links.update({int(i):entry['url'] for i,entry in approved['verifiedOverrides'].items()})
    assert set(site_links) <= set(eligible_sites) and all(map(valid_https,site_links.values()))
    source_groups = {r['raw']['id']:r for r in source('site_groups')}
    links = [r['raw'] for r in source('site_group_members')]
    assert len(links) == 246 and len(source_groups) == 12
    assert {(int(r['site_id']),int(r['group_id'])) for r in rows(work,'gfn_site_group_map')} == {
        (r['site_id'],r['group_id']) for r in links}
    groups_by_site = defaultdict(list)
    for r in links:
        groups_by_site[r['site_id']].append(r['group_id'])

    logo_index = read_ndjson(seed/'assets/site-logo-index.ndjson')
    assets = {p.stem:p for p in (seed/'assets/site-logos').glob('*.webp')}
    assert len(assets) == 218 and all(sha256(p.read_bytes()).hexdigest() == checksum for checksum,p in assets.items())
    logos = {r['legacy_site_id']:r['output_sha256'] for r in logo_index if r['output_sha256'] in assets}
    logo_dir = ROOT/'public/media/site'
    logo_dir.mkdir(parents=True, exist_ok=True)
    public_logos = {logos[i] for i in eligible_sites if i in logos}
    for checksum in sorted(public_logos):
        logo_file = logo_dir / f'{checksum}.webp'
        logo_file.write_bytes(assets[checksum].read_bytes())

    sites = [
        {'id':i, **copy(old_sites[i]['candidate']), 'groups':sorted(groups_by_site[i]), 'rating':site_ratings[i],
         'legacyNsfw':int(dump_sites[i]['nsfw']), **({'url':site_links[i]} if i in site_links else {}),
         **({'logo':f'/media/site/{logos[i]}.webp'} if i in logos else {})}
        for i in eligible_sites
    ]
    groups = [
        {'id':i, **copy(row['candidate']),
         'members':[r['site_id'] for r in sorted(links, key=lambda r:(-r['weight'],r['site_id']))
                    if r['group_id']==i and r['site_id'] in eligible_sites]}
        for i,row in sorted(source_groups.items(), key=lambda e: (e[1]['raw']['priority'],e[0]))
    ]

    game_rows = {r['raw']['id']:r for r in source('games')}
    assert len(game_rows) == 261 and set(game_rows) == {int(r['id']) for r in rows(work,'gfg_game')}
    tag_categories = {r['raw']['id']:r['raw']['code'] for r in source('game_tag_categories') if not r['raw']['archived_at']}
    raw_tags = {r['raw']['id']:r['raw'] for r in source('game_tags')}
    membership = defaultdict(list)
    for item in source('game_tag_members'):
        row = item['raw']
        membership[row['game_id']].append({'id':row['tag_id'],'role':row['role']})
    restricted_games = {i for i, tag_list in membership.items() if any(raw_tags[t['id']]['code']=='adult' for t in tag_list)}
    assert len(raw_tags) == 214 and sum(map(len,membership.values())) == 5053
    assert len(restricted_games) == 63 and restricted_games == {
        i for i,r in game_rows.items() if r['candidate']['adult_evidence'] == 'legacy_adult'}
    eligible_games = sorted(game_rows)
    assert 355 not in eligible_games and set(map(int,ratings['games'])) <= restricted_games
    game_ratings = {i:ratings['games'].get(str(i),'nsfw' if i in restricted_games else 'sfw') for i in eligible_games}
    assert Counter(game_ratings.values()) == {'sfw':203,'nsfw':58}
    tags = [
        {'id':i,'code':r['code'],'category':tag_categories[r['category_id']],'title':dual(r['name'],r['name_en'])}
        for i,r in sorted(raw_tags.items()) if not r['archived_at'] and r['category_id'] in tag_categories
    ]
    tag_ids = {r['id'] for r in tags}

    details = {int(r['game_id']):r for r in rows(work,'gfg_game_details') if r['source']=='steam'}
    localizations = {(int(r['game_id']),r['lang']):r for r in rows(work,'gfg_game_localized_details')}
    game_assets = rows(work, 'gfg_game_assets')
    movies, movie_audit = recover_movies(game_assets, rows(work, 'gfg_game_media'), {
        i: int(row['candidate']['steam_appid']) for i, row in game_rows.items()
    })
    movie_totals = {
        'gamesWithMovies': len({row['gameId'] for row in movie_audit}),
        'movies': len(movie_audit),
        'formats': dict(Counter(kind for row in movie_audit for kind in row['formats'])),
        'dispositions': dict(Counter(row['disposition'] for row in movie_audit)),
    }
    print('Legacy game movies', movie_totals)
    media = defaultdict(list)
    for row in game_assets:
        if row['exists']=='t' and row['asset_type'] in ('header','screenshot_full'):
            media[int(row['game_id'])].append(row)
    releases = {r['raw']['game_id']:r['raw'] for r in source('game_release_candidates')}
    games = []
    for i in eligible_games:
        row=game_rows[i]['candidate']
        app_id=int(row['steam_appid'])
        steam=details.get(i,{})
        platforms=[p for p,enabled in json.loads(steam.get('platforms') or '{}').items() if enabled is True]
        header_candidates=[]
        screenshots=[]
        for item in sorted(media[i],key=lambda r:(r['lang']!='en',int(r['sort_order']),int(r['id']))):
            url=official_media(item['url'],app_id)
            if not url or int(item['appid'])!=app_id:
                continue
            if item['asset_type']=='header':
                header_candidates.append(url)
            elif url not in screenshots:
                screenshots.append(url)
        body=dual(*[
            readable((info:=localizations.get((i,locale),{})).get('about_the_game') or info.get('detailed_description'))
            for locale in ('zh','en')
        ])
        games.append({
            'id':i, 'appId':app_id, **copy(row), 'body':body, 'rating':game_ratings[i],
            'developers': row['developers'] or [], 'publishers': row['publishers'] or [],
            'platforms':platforms, 'screenshots':screenshots[:6],
            **({'movies':movies[i]} if i in movies else {}),
            **({'cover':header_candidates[0]} if header_candidates else {}),
            **release_text(releases.get(i)),
            'tags':sorted((t for t in membership[i] if t['id'] in tag_ids),key=lambda t:(t['role']!='primary',t['id'])),
        })

    all_collection_members=defaultdict(set)
    for item in source('collection_manual_members'):
        r=item['raw']
        all_collection_members[r['collection_id']].add(r['game_id'])
    for item in source('collection_tag_rules'):
        r=item['raw']
        if r['tag_id'] in tag_ids:
            all_collection_members[r['collection_id']].update(
                i for i,tags_for_game in membership.items() if any(t['id']==r['tag_id'] for t in tags_for_game))
    for item in source('collection_exclusions'):
        r=item['raw']
        all_collection_members[r['collection_id']].discard(r['game_id'])
    collection_source=source('game_collections')
    assert len(collection_source)==16 and all(r['raw']['status']=='published' for r in collection_source)
    collections=[
        {'id':r['raw']['id'],'code':r['raw']['code'],**copy(r['candidate']),
         'members':sorted(all_collection_members[r['raw']['id']] & set(eligible_games))}
        for r in sorted(collection_source,key=lambda r:r['raw']['id'])
    ]
    assert sum(len(c['members']) for c in collections) == 524

    updates=[]
    for row in rows(work,'gfn_nav_update_notice'):
        if row['deleted']!='f' or row['publication_state']!='published' or not row['published_at']:
            continue
        published=datetime.fromisoformat(row['published_at'])
        if published.tzinfo is None:
            published = published.replace(tzinfo=CUTOFF.tzinfo)
        if published > CUTOFF:
            continue
        updates.append({
            'id':int(row['id']), 'title':dual(row['title'],row['title_en']),
            'description':dual(row['summary'],row['summary_en']),
            'body':dual(row['body'],row['body_en']), 'date':published.isoformat(),
            'version':row['version'] or '', 'commit':row['commit_sha'] or '',
        })
    assert len(updates)==31
    updates.sort(key=lambda row:(row['date'],row['id']),reverse=True)
    featured=sorted((game_rows[i] for i in eligible_games if game_rows[i]['candidate']['showcase_eligible']),
                    key=lambda r:(-(r['raw']['weight'] or 0),r['raw']['id']))
    catalog={
        'sites':sites,'groups':groups,'games':games,'tags':tags,'collections':collections,'updates':updates,
        'featuredGames':[r['raw']['id'] for r in featured],
    }
    write(ROOT/'content/catalog/catalog.json',catalog)
    write(ROOT/'content/curation/publication.json', {
        'snapshot':'legacy-20261115','siteIds':eligible_sites,'gameIds':eligible_games,'deletedSites':deleted,'deletedGames':[355],
    })
    write(work/'publication-audit.json', {
        'legacyAdultSites':sorted(adult_sites),'legacyAdultGames':sorted(restricted_games),
        'missingLinks':sorted(set(eligible_sites)-set(site_links)),
        'fullCollectionMembers':{c['code']:sorted(all_collection_members[c['id']]) for c in collections},
        'publicLogoObjects':len(public_logos),'sourceLogoObjects':len(assets),
    })
    write(work/'movie-audit.json', {'backupSha256': BACKUP, **movie_totals, 'records': movie_audit})
    print('V1 publication totals', {k:len(v) for k,v in catalog.items()}, 'public logo objects',len(public_logos))
    print('Collections', {r['code']:(len(all_collection_members[r['id']]),len(r['members'])) for r in collections})
    print('Verified game media',sum(bool(r.get('cover')) for r in games),sum(len(r['screenshots']) for r in games))
    print('Release evidence',Counter(r.get('releasePrecision') for r in games))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('work',type=Path,help='Directory with verified seed/ and selected COPY exports')
    main(parser.parse_args().work)
