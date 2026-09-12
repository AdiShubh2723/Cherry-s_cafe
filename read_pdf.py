from pathlib import Path
from pypdf import PdfReader

pdf_path = Path(r"c:\Users\Asus\OneDrive\Desktop\Cherry's Cafe Menu\Cherry's Cafe Menu.pdf")
print('exists', pdf_path.exists())
print('path', pdf_path)

reader = PdfReader(str(pdf_path))
print('pages', len(reader.pages))

for i, page in enumerate(reader.pages, start=1):
    text = page.extract_text() or ''
    print(f'--- PAGE {i} ---')
    print(text[:5000])
    print()
