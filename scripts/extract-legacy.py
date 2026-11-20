"""Extract an authenticated local snapshot and selected public-table COPY records."""
import argparse
from hashlib import sha256
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parent.parent
ARCHIVES = {
    'full': '7ecb9fd2d31f5f4246ea8a814e222dc346130962c8a3376b83edabcb5a29b65a',
    'seed': '3df0e552df2dd4fb5af2e5db2d6cd1d5431c0e815648a455e33413321d5fd401',
}
SECTIONS = {
    'gfn': ('gfn_site', 'gfn_site_group_map', 'gfn_nav_update_notice'),
    'gfg': ('gfg_game', 'gfg_game_details', 'gfg_game_localized_details', 'gfg_game_assets'),
}


def digest(path):
    value = sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            value.update(chunk)
    return value.hexdigest()


def extract(archive, work, prefix):
    if digest(archive) != ARCHIVES[prefix]:
        raise SystemExit(f'Unexpected SHA256 for {prefix} archive')
    selected = {'gfn.dump', 'gfg.dump', 'manifest.txt', 'SHA256SUMS'}
    seen = set()
    zstd = """
const { createReadStream } = require('node:fs')
const { createZstdDecompress } = require('node:zlib')
const { pipeline } = require('node:stream/promises')
pipeline(createReadStream(process.argv[1]), createZstdDecompress(), process.stdout)
  .catch((error) => { console.error(error.message); process.exitCode = 1 })
"""
    with subprocess.Popen(['node', '-e', zstd, str(archive)], stdout=subprocess.PIPE) as process:
        with tarfile.open(fileobj=process.stdout, mode='r|') as tar:
            for member in tar:
                path = PurePosixPath(member.name)
                if path.is_absolute() or '..' in path.parts or '\\' in member.name:
                    raise ValueError(f'Unexpected archive member: {member.name}')
                if prefix == 'full' and member.name not in selected:
                    continue
                if prefix == 'seed' and not member.name.startswith('seed/'):
                    continue
                if member.isdir():
                    continue
                if not member.isfile() or member.name in seen:
                    raise ValueError(f'Unexpected archive member: {member.name}')
                seen.add(member.name)
                destination = work.joinpath(*path.parts)
                if not destination.resolve().is_relative_to(work):
                    raise ValueError(f'Archive member escapes scratch directory: {member.name}')
                destination.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as source, destination.open('wb') as target:
                    shutil.copyfileobj(source, target)
        # tarfile stops at the end marker. Drain padding so the decompressor exits normally.
        while process.stdout.read(1024 * 1024):
            pass
        if process.wait() != 0:
            raise SystemExit(f'Could not decompress {prefix}')
    if prefix == 'full' and seen != selected:
        raise SystemExit('The full archive did not contain the required data members')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('full_backup', type=Path)
    parser.add_argument('bootstrap', type=Path)
    parser.add_argument('--work', type=Path, default=ROOT/'.local/v1')
    parser.add_argument('--postgres-image', default='mirror.gcr.io/library/postgres:18.7')
    args = parser.parse_args()
    work = args.work.resolve()
    if not work.is_relative_to((ROOT/'.local').resolve()):
        parser.error('--work must be inside the repository .local/ folder')
    work.mkdir(parents=True, exist_ok=True)
    extract(args.full_backup.resolve(), work, 'full')
    extract(args.bootstrap.resolve(), work, 'seed')
    checksums = {name: checksum for checksum, name in
                 (line.split(maxsplit=1) for line in (work/'SHA256SUMS').read_text().splitlines())}
    for db, names in SECTIONS.items():
        dump = db + '.dump'
        if digest(work / dump) != checksums[dump]:
            raise SystemExit(f'Unexpected SHA256 for {dump}')
        for name in names:
            with (work/f'{name}.copy').open('wb') as target:
                subprocess.run([
                    'docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'pg_restore',
                    '--mount', f'type=bind,source={work},target=/import,readonly', args.postgres_image,
                    '-a', '-t', name, '-f', '-', '/import/' + dump,
                ], check=True, stdout=target)
        print('Verified and extracted', db)


if __name__ == '__main__':
    main()
