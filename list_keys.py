import json

def get_keys(obj, keys):
    if isinstance(obj, dict):
        for k, v in obj.items():
            keys.add(k)
            get_keys(v, keys)
    elif isinstance(obj, list):
        for item in obj:
            get_keys(item, keys)

try:
    with open('fci.json', encoding='utf-8') as f:
        data = json.load(f)
        keys = set()
        get_keys(data, keys)
        for k in sorted(list(keys)):
            print(k)
except Exception as e:
    print(f"Error: {e}")
