#!/usr/bin/env python3
"""
Extract sites from yinghezhinan.com and sync to the project
"""
import requests
import re
import json
import sys
from urllib.parse import urlparse

YINGHE_URL = "https://yinghezhinan.com"
SITES_URL = f"{YINGHE_URL}/sitemap.xml"

def get_sites_from_sitemap():
    """Extract all site URLs from sitemap"""
    print(f"Fetching sitemap from {SITES_URL}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    response = requests.get(SITES_URL, headers=headers, timeout=15)
    response.raise_for_status()
    
    # Extract site URLs (format: https://yinghezhinan.com/site/xxxxx/)
    sites = re.findall(r'https://yinghezhinan\.com/site/[^<]+', response.text)
    return list(set(sites))  # Remove duplicates

def extract_site_info(site_url):
    """Extract metadata from a single site page"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(site_url, headers=headers, timeout=10)
        
        # Extract title
        title_match = re.search(r'<title>([^<]+)</title>', response.text)
        name = title_match.group(1).replace(' - 硬核指南', '').strip() if title_match else ''
        
        if not name:
            return None
            
        # Extract description
        desc_match = re.search(r'<meta name="description" content="([^"]+)"', response.text)
        description = desc_match.group(1).strip() if desc_match else ''
        
        # Extract actual site URL - look for a[href] that's not yinghezhinan.com
        url_match = re.search(r'href="([^"]*?://\S+?)"', response.text, re.DOTALL)
        actual_url = ''
        
        if url_match:
            for href in url_match.group(1).split('"'):
                href = href.strip()
                if not href.startswith(('https://yinghezhinan.com', 'https:', '//', 'javascript:', '#', 'mailto:')):
                    actual_url = href
                    if actual_url.endswith(('"', "'")):
                        actual_url = actual_url[:-1]
                    break
        
        # Fallback if no actual URL found
        if not actual_url or urlparse(actual_url).netloc == 'yinghezhinan.com':
            actual_url = site_url
        
        return {
            'name': name,
            'url': actual_url,
            'description': description[:300] if description else ''
        }
    except Exception as e:
        print(f"Error extracting {site_url}: {e}")
        return None

def classify_category(url, name, description):
    """Predict category based on URL patterns and content keywords"""
    keywords = {
        'education': ['学习', '教育', '教程', '课程', '知识', 'book', 'course', 'learn', 'education'],
        'developer': ['开发', '工具', 'git', 'code', 'api', 'java', 'python', 'node', '前端', '后端', '编程'],
        'tools': ['工具', '软件', 'app', 'download', 'design', 'photo', 'video', 'audio', 'pdf', 'convert'],
        'entertainment': ['电影', '动漫', '游戏', '小说', '漫画', '视频', '音乐', '综艺', '娱乐', 'tv', 'game', 'movie', 'anime']
    }
    
    text = (name + ' ' + description).lower()
    
    for category, words in keywords.items():
        for word in words:
            if word in text:
                return category
    return 'tools'  # Default

def main():
    # Get sites list
    sites = get_sites_from_sitemap()
    print(f"Found {len(sites)} site URLs")
    
    # Extract information from each site
    extracted_sites = []
    for i, site_url in enumerate(sites):
        print(f"Extracting ({i+1}/{len(sites)}): {site_url}")
        site_info = extract_site_info(site_url)
        
        if site_info:
            site_info['category'] = classify_category(
                site_info['url'], 
                site_info['name'], 
                site_info['description']
            )
            extracted_sites.append(site_info)
    
    print(f"\nExtracted {len(extracted_sites)} sites")
    
    # Save to JSON file
    output_file = '/Users/wangji/Documents/navigation/navigation-website/project/data/yinghe_sites.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(extracted_sites, f, ensure_ascii=False, indent=2)
    
    print(f"Saved to {output_file}")
    
    # Print summary
    print("\n=== Summary ===")
    category_counts = {}
    for site in extracted_sites:
        cat = site['category']
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    for cat, count in sorted(category_counts.items()):
        print(f"{cat}: {count}")

if __name__ == '__main__':
    main()
