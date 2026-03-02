"""
Device Detector Utility
Parse user-agent string and extract device information
"""
from typing import Dict, Optional
from fastapi import Request
import re


def get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request.
    Prioritizes Cloudflare's CF-Connecting-IP header which contains
    the real visitor IP when using Cloudflare Tunnel.
    """
    # Prioritas 1: CF-Connecting-IP dari Cloudflare (IP asli user)
    cf_ip = request.headers.get('cf-connecting-ip')
    if cf_ip:
        return cf_ip.strip()

    # Prioritas 2: X-Real-IP (di-set oleh nginx dari CF-Connecting-IP)
    real_ip = request.headers.get('x-real-ip')
    if real_ip:
        return real_ip.strip()

    # Prioritas 3: X-Forwarded-For (ambil IP pertama = client asli)
    forwarded_for = request.headers.get('x-forwarded-for')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()

    # Fallback ke koneksi langsung
    return request.client.host if request.client else 'unknown'


def parse_user_agent(user_agent_string: str) -> Dict[str, Optional[str]]:
    """
    Parse user agent string to extract browser, OS, and device information
    Simple parser without external dependencies
    
    Args:
        user_agent_string: Full user agent string from HTTP headers
    
    Returns:
        Dictionary with browser, os, device_type, device_model
    """
    if not user_agent_string:
        return {
            'browser': None,
            'os': None,
            'device_type': 'web',
            'device_model': None
        }
    
    ua_lower = user_agent_string.lower()
    
    # Detect browser
    browser = None
    if 'edg' in ua_lower or 'edge' in ua_lower:
        browser = 'Microsoft Edge'
    elif 'chrome' in ua_lower and 'safari' in ua_lower:
        browser = 'Google Chrome'
    elif 'firefox' in ua_lower:
        browser = 'Mozilla Firefox'
    elif 'safari' in ua_lower and 'chrome' not in ua_lower:
        browser = 'Safari'
    elif 'opera' in ua_lower or 'opr' in ua_lower:
        browser = 'Opera'
    elif 'msie' in ua_lower or 'trident' in ua_lower:
        browser = 'Internet Explorer'
    else:
        browser = 'Unknown Browser'
    
    # Extract browser version (simplified)
    version_match = None
    if 'chrome' in ua_lower:
        version_match = re.search(r'chrome/([\d.]+)', ua_lower)
    elif 'firefox' in ua_lower:
        version_match = re.search(r'firefox/([\d.]+)', ua_lower)
    elif 'safari' in ua_lower:
        version_match = re.search(r'version/([\d.]+)', ua_lower)
    
    if version_match and browser:
        browser = f"{browser} {version_match.group(1)}"
    
    # Detect OS
    os = None
    if 'windows nt 10' in ua_lower:
        os = 'Windows 10/11'
    elif 'windows nt 6.3' in ua_lower:
        os = 'Windows 8.1'
    elif 'windows nt 6.2' in ua_lower:
        os = 'Windows 8'
    elif 'windows nt 6.1' in ua_lower:
        os = 'Windows 7'
    elif 'windows' in ua_lower:
        os = 'Windows'
    elif 'mac os x' in ua_lower or 'macos' in ua_lower:
        mac_version = re.search(r'mac os x ([\d_]+)', ua_lower)
        if mac_version:
            os = f"macOS {mac_version.group(1).replace('_', '.')}"
        else:
            os = 'macOS'
    elif 'android' in ua_lower:
        android_version = re.search(r'android ([\d.]+)', ua_lower)
        if android_version:
            os = f"Android {android_version.group(1)}"
        else:
            os = 'Android'
    elif 'iphone' in ua_lower or 'ipad' in ua_lower:
        ios_version = re.search(r'os ([\d_]+)', ua_lower)
        if ios_version:
            os = f"iOS {ios_version.group(1).replace('_', '.')}"
        else:
            os = 'iOS'
    elif 'linux' in ua_lower:
        os = 'Linux'
    elif 'ubuntu' in ua_lower:
        os = 'Ubuntu'
    else:
        os = 'Unknown OS'
    
    # Detect device type
    device_type = 'web'
    device_model = None
    
    if 'mobile' in ua_lower or 'android' in ua_lower or 'iphone' in ua_lower:
        device_type = 'mobile'
    elif 'tablet' in ua_lower or 'ipad' in ua_lower:
        device_type = 'tablet'
    
    # Try to extract device model for mobile
    if device_type in ['mobile', 'tablet']:
        # Android device model
        if 'android' in ua_lower:
            model_match = re.search(r';\s*([^;)]+)\s+build', ua_lower)
            if model_match:
                device_model = model_match.group(1).strip().title()
        
        # iPhone/iPad model
        elif 'iphone' in ua_lower:
            device_model = 'iPhone'
        elif 'ipad' in ua_lower:
            device_model = 'iPad'
    
    return {
        'browser': browser,
        'os': os,
        'device_type': device_type,
        'device_model': device_model
    }


def detect_device_info(request: Request) -> Dict[str, Optional[str]]:
    """
    Main function to extract all device information from HTTP request
    
    Args:
        request: FastAPI Request object
    
    Returns:
        Dictionary containing:
        - user_agent: Full user agent string
        - browser: Browser name with version
        - os: Operating system
        - device_type: 'web', 'mobile', or 'tablet'
        - device_model: Device model (for mobile/tablet)
        - ip_address: Client IP address
    """
    # Get user agent string
    user_agent_string = request.headers.get('user-agent', '')
    
    # Parse user agent
    parsed = parse_user_agent(user_agent_string)
    
    # Get IP address
    ip_address = get_client_ip(request)
    
    return {
        'user_agent': user_agent_string,
        'browser': parsed['browser'],
        'os': parsed['os'],
        'device_type': parsed['device_type'],
        'device_model': parsed['device_model'],
        'ip_address': ip_address,
        # Geolocation fields (to be filled by external service if needed)
        'country': None,
        'city': None
    }


# Optional: IP Geolocation (requires external service or database)
# For production, consider using:
# - MaxMind GeoLite2 database (free)
# - ipapi.co API
# - ip-api.com API

def get_geolocation_from_ip(ip_address: str) -> Dict[str, Optional[str]]:
    """
    Get geolocation from IP address
    Placeholder - implement with GeoIP database or API in production
    
    Args:
        ip_address: IP address string
    
    Returns:
        Dictionary with country and city
    """
    # TODO: Implement with GeoIP database or API
    # Example with ip-api.com (requires requests library):
    # try:
    #     response = requests.get(f'http://ip-api.com/json/{ip_address}', timeout=2)
    #     data = response.json()
    #     return {
    #         'country': data.get('country'),
    #         'city': data.get('city')
    #     }
    # except:
    #     return {'country': None, 'city': None}
    
    # For now, return None
    return {
        'country': None,
        'city': None
    }
