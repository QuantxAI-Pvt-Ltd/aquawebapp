#!/usr/bin/env python3
"""
PaddleOCR wrapper script for Node.js integration.

Usage:
  python3 utils/paddle_ocr.py [--lang en] < image_bytes
  cat image.jpg | python3 utils/paddle_ocr.py

Reads raw image bytes from stdin, runs PaddleOCR, and prints
recognized text lines to stdout (one per line).
"""

import sys
import os
import argparse
import tempfile

def main():
    parser = argparse.ArgumentParser(description='PaddleOCR wrapper')
    parser.add_argument('--lang', default='en', help='OCR language (default: en)')
    args = parser.parse_args()

    # Read image bytes from stdin
    image_bytes = sys.stdin.buffer.read()
    if not image_bytes:
        sys.stderr.write('ERROR: No image data received on stdin\n')
        sys.exit(1)

    # Write to a temp file (PaddleOCR works best with file paths)
    suffix = '.png'
    # Detect PDF header
    if image_bytes[:4] == b'%PDF':
        suffix = '.pdf'

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        from paddleocr import PaddleOCR
        import os
        # Disable redundant network model source checks to speed up OCR
        os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'
        try:
            ocr = PaddleOCR(use_angle_cls=True, lang=args.lang)
        except TypeError:
            try:
                ocr = PaddleOCR(lang=args.lang)
            except Exception:
                ocr = PaddleOCR()
        except Exception:
            ocr = PaddleOCR(lang=args.lang)

        try:
            result = ocr.predict(tmp_path)
        except Exception:
            result = ocr.ocr(tmp_path)

        if result:
            for page in result:
                if not page:
                    continue
                # PaddleOCR 3.x dict format
                if isinstance(page, dict) and 'rec_texts' in page:
                    for text in page.get('rec_texts', []):
                        if text:
                            print(text)
                # Legacy PaddleOCR 2.x list of lines
                elif isinstance(page, list):
                    for line in page:
                        if isinstance(line, list) and len(line) >= 2:
                            text_info = line[1]
                            if isinstance(text_info, (list, tuple)) and len(text_info) >= 1:
                                print(text_info[0])
                            elif isinstance(text_info, str):
                                print(text_info)
    except ImportError:
        sys.stderr.write('ERROR: paddleocr is not installed. Run: pip install paddleocr paddlepaddle\n')
        sys.exit(2)
    except Exception as e:
        sys.stderr.write(f'ERROR: PaddleOCR failed: {e}\n')
        sys.exit(1)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

if __name__ == '__main__':
    main()
