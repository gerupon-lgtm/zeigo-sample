"""Fetch a self-hosted Japanese type subset; not needed when running the site."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
import re

root = Path(__file__).resolve().parent.parent
source = ''.join(p.read_text(encoding='utf-8') for p in (root / 'src').iterdir() if p.suffix in ('.tsx', '.ts', '.json'))
chars = ''.join(sorted(set(re.findall(r'[^\x00-\x7f]', source)))) + '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz¥–'
url = 'https://fonts.googleapis.com/css2?' + urlencode({'family': 'Noto Serif JP:wght@400..700', 'text': chars, 'display': 'swap'})
req = Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'})
with urlopen(req, timeout=40) as response:
    css = response.read().decode('utf-8')
font_url = re.search(r'url\(([^)]+)\)', css).group(1)
with urlopen(font_url, timeout=40) as response:
    (root / 'public/fonts/mincho.woff2').write_bytes(response.read())
with urlopen('https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifjp/OFL.txt', timeout=40) as response:
    (root / 'public/fonts/OFL.txt').write_bytes(response.read())
print('Self-hosted font saved. CSS format:', re.search(r"format\('([^']+)'\)", css).group(1))
