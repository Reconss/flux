#!/usr/bin/env python3
import requests
import re
import json

def extract_simple(site_url):
    try:
        response = requests.get(site_url, timeout=5)
        name_match = re.search(r'<title>([^<]+)</title>', response.text)
        name = name_match.group(1).replace(' - 硬核指南', '').strip() if name_match else ''
        
        if not name:
            return None
            
        desc_match = re.search(r'<meta name="description" content="([^"]+)"', response.text)
        description = desc_match.group(1).strip() if desc_match else ''
        
        url_match = re.search(r'href="([^"]*?://\S+?)"', response.text)
        actual_url = url_match.group(1).strip('"') if url_match else site_url
        
        return {'name': name, 'url': actual_url, 'description': description[:200]}
    except:
        return None

# Sample sites
sample_sites = [
    'https://yinghezhinan.com/site/xiguatv/',
    'https://yinghezhinan.com/site/boluomanhua/',
    'https://yinghezhinan.com/site/yinyueku/',
    'https://yinghezhinan.com/site/biquge/',
    'https://yinghezhinan.com/site/atoms/',
    'https://yinghezhinan.com/site/pansou/',
    'https://yinghezhinan.com/site/qingtuguan/',
]

result = []
for site in sample_sites:
    info = extract_simple(site)
    if info:
        result.append(info)

with open('sample_extract.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
    
print(json.dumps(result, ensure_ascii=False, indent=2))
