import os
import glob
import re

css_path = 'src/index.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

variables = """
@layer base {
  :root {
    --bg-main: #f8fafc;
    --text-main: #0f172a;
    --scrollbar-track: rgba(0, 0, 0, 0.03);
    --scrollbar-thumb: rgba(0, 0, 0, 0.15);
    --scrollbar-thumb-hover: rgba(0, 0, 0, 0.25);
    
    --glass-bg: #ffffff;
    --glass-border: rgba(0, 0, 0, 0.08);
    --glass-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    --glass-hover-bg: #fcfcfc;
    --glass-hover-border: rgba(0, 0, 0, 0.12);
    --glass-hover-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
    
    --input-bg: #ffffff;
    --input-border: rgba(0, 0, 0, 0.15);
    --input-text: #0f172a;
    --input-placeholder: rgba(0, 0, 0, 0.4);
    --input-focus-bg: #ffffff;
    
    --btn-disabled-bg: rgba(0, 0, 0, 0.05);
    --btn-disabled-text: rgba(0, 0, 0, 0.3);
    
    --shimmer-1: rgba(0, 0, 0, 0.03);
    --shimmer-2: rgba(0, 0, 0, 0.08);
    
    --btn-outline-text: #6d28d9;
    --btn-outline-border: rgba(109, 40, 217, 0.4);
    --btn-outline-hover-bg: rgba(109, 40, 217, 0.05);
    --btn-outline-disabled-border: rgba(0, 0, 0, 0.1);
  }

  .dark {
    --bg-main: linear-gradient(145deg, #0a0a12 0%, #0f0a1e 30%, #0d1025 60%, #0a0e1a 100%);
    --text-main: #e2e8f0;
    --scrollbar-track: rgba(255, 255, 255, 0.03);
    --scrollbar-thumb: rgba(255, 255, 255, 0.12);
    --scrollbar-thumb-hover: rgba(255, 255, 255, 0.2);
    
    --glass-bg: rgba(255, 255, 255, 0.04);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    --glass-hover-bg: rgba(255, 255, 255, 0.06);
    --glass-hover-border: rgba(255, 255, 255, 0.12);
    --glass-hover-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    
    --input-bg: rgba(255, 255, 255, 0.04);
    --input-border: rgba(255, 255, 255, 0.1);
    --input-text: #e2e8f0;
    --input-placeholder: rgba(255, 255, 255, 0.3);
    --input-focus-bg: rgba(255, 255, 255, 0.06);
    
    --btn-disabled-bg: rgba(255, 255, 255, 0.08);
    --btn-disabled-text: rgba(255, 255, 255, 0.3);
    
    --shimmer-1: rgba(255, 255, 255, 0.03);
    --shimmer-2: rgba(255, 255, 255, 0.08);
    
    --btn-outline-text: #c4b5fd;
    --btn-outline-border: rgba(139, 92, 246, 0.4);
    --btn-outline-hover-bg: rgba(139, 92, 246, 0.1);
    --btn-outline-disabled-border: rgba(255, 255, 255, 0.08);
  }
"""

css_content = re.sub(r'@layer base \{', variables, css_content)

css_content = re.sub(r'background: linear-gradient[^;]+;', 'background: var(--bg-main);', css_content)
css_content = re.sub(r'color: #e2e8f0;', 'color: var(--text-main);', css_content)
css_content = re.sub(r'background: rgba\(255, 255, 255, 0\.03\);', 'background: var(--scrollbar-track);', css_content)
css_content = re.sub(r'background: rgba\(255, 255, 255, 0\.12\);', 'background: var(--scrollbar-thumb);', css_content)
css_content = re.sub(r'background: rgba\(255, 255, 255, 0\.2\);', 'background: var(--scrollbar-thumb-hover);', css_content)

css_content = re.sub(r'background: rgba\(255, 255, 255, 0\.04\);', 'background: var(--glass-bg);', css_content)
css_content = re.sub(r'border: 1px solid rgba\(255, 255, 255, 0\.08\);', 'border: 1px solid var(--glass-border);', css_content)
css_content = re.sub(r'box-shadow:\s*0 4px 24px rgba\(0, 0, 0, 0\.2\),\s*inset 0 1px 0 rgba\(255, 255, 255, 0\.05\);', 'box-shadow: var(--glass-shadow);', css_content)
css_content = re.sub(r'background: rgba\(255, 255, 255, 0\.06\);', 'background: var(--glass-hover-bg);', css_content)
css_content = re.sub(r'border-color: rgba\(255, 255, 255, 0\.12\);', 'border-color: var(--glass-hover-border);', css_content)
css_content = re.sub(r'box-shadow:\s*0 8px 32px rgba\(0, 0, 0, 0\.25\),\s*inset 0 1px 0 rgba\(255, 255, 255, 0\.08\);', 'box-shadow: var(--glass-hover-shadow);', css_content)

css_content = re.sub(r'\.glass-input \{[\s\S]*?\}', r'''.glass-input {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 10px;
    color: var(--input-text);
    padding: 10px 14px;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.25s ease;
    width: 100%;
  }''', css_content)

css_content = re.sub(r'\.glass-input::placeholder \{[\s\S]*?\}', r'''.glass-input::placeholder {
    color: var(--input-placeholder);
  }''', css_content)

css_content = re.sub(r'\.glass-input:focus \{[\s\S]*?\}', r'''.glass-input:focus {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1), 0 0 16px rgba(139, 92, 246, 0.08);
    background: var(--input-focus-bg);
  }''', css_content)

css_content = re.sub(r'\.btn-gradient:disabled \{[\s\S]*?\}', r'''.btn-gradient:disabled {
    background: var(--btn-disabled-bg);
    color: var(--btn-disabled-text);
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }''', css_content)

css_content = re.sub(r'\.btn-outline \{[\s\S]*?\}', r'''.btn-outline {
    background: transparent;
    color: var(--btn-outline-text);
    font-weight: 600;
    font-size: 0.875rem;
    padding: 12px 20px;
    border-radius: 10px;
    border: 1px solid var(--btn-outline-border);
    cursor: pointer;
    transition: all 0.3s ease;
  }''', css_content)

css_content = re.sub(r'\.btn-outline:hover \{[\s\S]*?\}', r'''.btn-outline:hover {
    background: var(--btn-outline-hover-bg);
    border-color: rgba(139, 92, 246, 0.6);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.15);
  }''', css_content)

css_content = re.sub(r'\.btn-outline:disabled \{[\s\S]*?\}', r'''.btn-outline:disabled {
    border-color: var(--btn-outline-disabled-border);
    color: var(--btn-disabled-text);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }''', css_content)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)

js_files = glob.glob('src/**/*.js', recursive=True)

replacements = {
    r'\btext-white\b': 'text-slate-900 dark:text-white',
    r'\btext-slate-100\b': 'text-slate-800 dark:text-slate-100',
    r'\btext-slate-200\b': 'text-slate-700 dark:text-slate-200',
    r'\btext-slate-300\b': 'text-slate-600 dark:text-slate-300',
    r'\btext-slate-400\b': 'text-slate-500 dark:text-slate-400',
    r'\bbg-white/\[0\.04\]': 'bg-white dark:bg-white/[0.04]',
    r'\bbg-white/\[0\.02\]': 'bg-slate-50 dark:bg-white/[0.02]',
    r'\bborder-white/\[0\.06\]': 'border-slate-200 dark:border-white/[0.06]',
    r'\bborder-white/\[0\.1\]': 'border-slate-300 dark:border-white/[0.1]',
    r'\bborder-white/\[0\.08\]': 'border-slate-200 dark:border-white/[0.08]',
    r'\bbg-white/10\b': 'bg-slate-200 dark:bg-white/10',
    r'\bbg-white/5\b': 'bg-slate-100 dark:bg-white/5',
}

for filepath in js_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern, repl in replacements.items():
        content = re.sub(pattern, repl, content)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
