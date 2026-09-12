import fitz
from pathlib import Path

pdf_path = Path(r"c:\Users\Asus\OneDrive\Desktop\Cherry's Cafe Menu\Cherry's Cafe Menu.pdf")
print('exists', pdf_path.exists())
print('path', pdf_path)

if not pdf_path.exists():
    raise SystemExit(1)

doc = fitz.open(pdf_path)
print('pages', len(doc))

out_dir = pdf_path.parent / 'pdf_pages'
out_dir.mkdir(exist_ok=True)

for i in range(len(doc)):
    page = doc[i]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    out = out_dir / f'page_{i + 1}.png'
    pix.save(out)
    print('saved', out)
