from pathlib import Path
from runpy import run_path
import unittest


recover_movies = run_path(str(Path(__file__).resolve().parents[1] / 'scripts/import-legacy.py'))['recover_movies']


class MovieRecoveryTest(unittest.TestCase):
    app_id = 123
    media_key = '456'
    thumbnail = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/456/movie.293x165.jpg'
    mp4 = 'https://cdn.akamai.steamstatic.com/steam/apps/456/movie_max.mp4'
    webm = 'https://cdn.akamai.steamstatic.com/steam/apps/456/movie480.webm'
    dash = 'https://video.akamai.steamstatic.com/store_trailers/123/42/' + 'a' * 40 + '/1234/dash_h264.mpd'

    def asset(self, kind, url, *, id='1', key=None, order='0', status='0', exists='t'):
        return {
            'game_id': '1', 'appid': str(self.app_id), 'media_key': key or self.media_key, 'sort_order': order,
            'asset_family': 'movie', 'asset_type': 'movie_' + kind, 'id': id, 'url': url, 'thumbnail_url': '',
            'title': 'Archived trailer', 'exists': exists, 'status_code': status, 'checked_at': '2026-11-15',
        }

    def media(self, extra='{}'):
        return {
            'game_id': '1', 'appid': str(self.app_id), 'media_key': self.media_key, 'sort_order': '0',
            'media_type': 'movie', 'title': 'Archived trailer', 'url': self.dash, 'thumbnail_url': self.thumbnail,
            'extra': extra,
        }

    def test_merges_formats_preserving_order_and_availability_evidence(self):
        assets = [
            self.asset('thumbnail', self.thumbnail, order='2'),
            self.asset('mp4_max', self.mp4, id='2', order='2', status='206'),
            self.asset('dash_h264', self.dash, id='3', order='2'),
            self.asset('thumbnail', self.thumbnail.replace('/456/', '/999/'), id='4', key='999'),
            self.asset('mp4_max', self.mp4.replace('/456/', '/999/'), id='5', key='999'),
        ]
        media = [self.media('{"webm_480_url": "' + self.webm + '?t=111", "id": 456}')]
        recovered, audit = recover_movies(assets, media, {1: self.app_id})
        self.assertEqual([movie['id'] for movie in recovered[1]], ['999', '456'])
        self.assertEqual(recovered[1][1], {
            'id': '456', 'title': 'Archived trailer', 'thumbnail': self.thumbnail, 'mp4': self.mp4, 'webm': self.webm,
        })
        self.assertEqual(audit[1]['formats'], ['mp4', 'webm', 'dash'])
        self.assertEqual(audit[1]['assetEvidence'][1]['statusCode'], 206)

    def test_rejects_unofficial_cross_movie_and_failed_sources(self):
        assets = [
            self.asset('mp4_max', self.mp4, status='404', exists='f'),
            self.asset('webm_480', self.webm.replace('/456/', '/999/'), id='2'),
        ]
        media = [self.media('{"mp4_max_url": "' + self.mp4 + '?t=111", "webm_max_url": '
                            '"https://cdn.akamai.steamstatic.com.example.com/steam/apps/456/movie_max.webm"}')]
        recovered, audit = recover_movies(assets, media, {1: self.app_id})
        self.assertEqual(dict(recovered), {})
        self.assertEqual(audit[0]['disposition'], 'streaming-only')
        self.assertEqual(audit[0]['formats'], ['dash'])

    def test_keeps_out_of_catalog_records_in_the_audit(self):
        recovered, audit = recover_movies([self.asset('mp4_max', self.mp4)], [self.media()], {})
        self.assertEqual(dict(recovered), {})
        self.assertEqual(audit[0]['disposition'], 'outside-publication')
