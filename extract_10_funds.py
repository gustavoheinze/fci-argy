import json

def extract_ids(limit=10):
    try:
        with open('fci.json', encoding='utf-8') as f:
            data = json.load(f)
            funds = []
            count = 0
            for fondo in data.get('data', []):
                fondo_id = fondo.get('id')
                clase_fondos = fondo.get('clase_fondos', [])
                for clase in clase_fondos:
                    if count < limit:
                        funds.append({
                            'fondoId': fondo_id,
                            'claseId': clase.get('id'),
                            'nombre': clase.get('nombre')
                        })
                        count += 1
                    else:
                        break
                if count >= limit:
                    break
            print(json.dumps(funds, indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_ids()
