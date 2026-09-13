// INSERIR_TROCAS.js — insere base de valores de troca no Agent One
const https = require('https');

const BASE = 'https://agent-one-mobile-production.up.railway.app';
const EMAIL = 'admin@loja.com';
const PASS  = 'Admin@2025';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve(buf); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const RULES = [
  {
    "model": "AirPods 1",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "AirPods 2",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "AirPods 2 Plus",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "AirPods 3",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": []
  },
  {
    "model": "AirPods Pro",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Apple Pencil 1",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": []
  },
  {
    "model": "Apple Pencil 2",
    "min_value": 100.0,
    "max_value": 400.0,
    "deductions": []
  },
  {
    "model": "Apple Watch Ultra 3 49mm",
    "min_value": 2000.0,
    "max_value": 4000.0,
    "deductions": []
  },
  {
    "model": "iPad 10 - 64GB",
    "min_value": 500.0,
    "max_value": 1300.0,
    "deductions": []
  },
  {
    "model": "iPad 6 - 128GB",
    "min_value": 400.0,
    "max_value": 600.0,
    "deductions": []
  },
  {
    "model": "iPad 6 - 32GB",
    "min_value": 400.0,
    "max_value": 400.0,
    "deductions": []
  },
  {
    "model": "iPad 7 - 128GB",
    "min_value": 500.0,
    "max_value": 800.0,
    "deductions": []
  },
  {
    "model": "iPad 7 - 32GB",
    "min_value": 600.0,
    "max_value": 700.0,
    "deductions": []
  },
  {
    "model": "iPad 8 - 32GB",
    "min_value": 600.0,
    "max_value": 900.0,
    "deductions": []
  },
  {
    "model": "iPad 9 - 64GB",
    "min_value": 600.0,
    "max_value": 900.0,
    "deductions": []
  },
  {
    "model": "iPad air 4th",
    "min_value": 1000.0,
    "max_value": 1000.0,
    "deductions": []
  },
  {
    "model": "Ipad air 64gb 5th",
    "min_value": 500.0,
    "max_value": 1000.0,
    "deductions": []
  },
  {
    "model": "iPad mini 5 64gb",
    "min_value": 500.0,
    "max_value": 900.0,
    "deductions": []
  },
  {
    "model": "Ipad Pro m4 13 Pol 512GB",
    "min_value": 1000.0,
    "max_value": 4000.0,
    "deductions": []
  },
  {
    "model": "iPad Pro Wi-Fi + Celular - 128GB",
    "min_value": 1000.0,
    "max_value": 1500.0,
    "deductions": []
  },
  {
    "model": "iPhone 11 - 128GB",
    "min_value": 300.0,
    "max_value": 700.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 130.0
      },
      {
        "item": "Bateria",
        "amount": 120.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 100.0
      },
      {
        "item": "Câmera traseira",
        "amount": 170.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 117.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 249.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 210.0
      }
    ]
  },
  {
    "model": "iPhone 11 - 256GB",
    "min_value": 300.0,
    "max_value": 700.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 130.0
      },
      {
        "item": "Bateria",
        "amount": 120.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 100.0
      },
      {
        "item": "Câmera traseira",
        "amount": 170.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 90.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 249.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 210.0
      }
    ]
  },
  {
    "model": "iPhone 11 - 64GB",
    "min_value": 300.0,
    "max_value": 600.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 130.0
      },
      {
        "item": "Bateria",
        "amount": 120.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 100.0
      },
      {
        "item": "Câmera traseira",
        "amount": 170.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 90.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 110.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 210.0
      },
      {
        "item": "Mancha na câmera",
        "amount": 115.0
      }
    ]
  },
  {
    "model": "iPhone 11 Pro - 256GB",
    "min_value": 500.0,
    "max_value": 1000.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 220.0
      },
      {
        "item": "Bateria",
        "amount": 120.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 370.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 90.0
      },
      {
        "item": "Flex Carga",
        "amount": 199.5
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 249.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 350.0
      }
    ]
  },
  {
    "model": "iPhone 11 Pro - 512GB",
    "min_value": 500.0,
    "max_value": 1200.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 220.0
      },
      {
        "item": "Bateria",
        "amount": 120.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 370.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 90.0
      },
      {
        "item": "Flex Carga",
        "amount": 199.5
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 249.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 350.0
      }
    ]
  },
  {
    "model": "iPhone 11 Pro - 64GB",
    "min_value": 500.0,
    "max_value": 900.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 220.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 370.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 90.0
      },
      {
        "item": "Flex Carga",
        "amount": 199.5
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 249.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 350.0
      }
    ]
  },
  {
    "model": "iPhone 11 Pro Max - 256GB",
    "min_value": 500.0,
    "max_value": 1100.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 300.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 370.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 90.0
      },
      {
        "item": "Flex Carga",
        "amount": 199.5
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 249.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 350.0
      },
      {
        "item": "Mancha na câmera",
        "amount": 119.0
      }
    ]
  },
  {
    "model": "iPhone 11 Pro Max - 512GB",
    "min_value": 500.0,
    "max_value": 1200.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 300.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 370.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 90.0
      },
      {
        "item": "Flex Carga",
        "amount": 199.5
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 249.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 350.0
      }
    ]
  },
  {
    "model": "iPhone 11 Pro Max - 64GB",
    "min_value": 500.0,
    "max_value": 1100.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 300.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 370.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 90.0
      },
      {
        "item": "Flex Carga",
        "amount": 199.5
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 249.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 224.5
      },
      {
        "item": "Carcaça",
        "amount": 350.0
      }
    ]
  },
  {
    "model": "iPhone 12 - 128GB",
    "min_value": 500.0,
    "max_value": 1200.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 260.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 180.0
      }
    ]
  },
  {
    "model": "iPhone 12 - 256GB",
    "min_value": 500.0,
    "max_value": 1200.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 260.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 180.0
      }
    ]
  },
  {
    "model": "iPhone 12 - 64GB",
    "min_value": 500.0,
    "max_value": 1100.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 260.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 180.0
      },
      {
        "item": "Mancha na câmera",
        "amount": 70.0
      }
    ]
  },
  {
    "model": "iPhone 12 Mini - 128GB",
    "min_value": 300.0,
    "max_value": 850.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 260.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 349.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 230.0
      }
    ]
  },
  {
    "model": "iPhone 12 Mini - 256GB",
    "min_value": 300.0,
    "max_value": 1100.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 260.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 349.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 230.0
      }
    ]
  },
  {
    "model": "iPhone 12 Mini - 64GB",
    "min_value": 300.0,
    "max_value": 800.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 110.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 260.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 349.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 230.0
      }
    ]
  },
  {
    "model": "iPhone 12 Pro - 128GB",
    "min_value": 800.0,
    "max_value": 1650.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 495.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 390.0
      }
    ]
  },
  {
    "model": "iPhone 12 Pro - 256GB",
    "min_value": 800.0,
    "max_value": 1650.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 800.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 390.0
      }
    ]
  },
  {
    "model": "iPhone 12 Pro - 512GB",
    "min_value": 800.0,
    "max_value": 1750.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 130.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 800.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 390.0
      }
    ]
  },
  {
    "model": "iPhone 12 Pro Max - 128GB",
    "min_value": 800.0,
    "max_value": 1800.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 500.0
      },
      {
        "item": "Bateria",
        "amount": 150.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 800.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 390.0
      }
    ]
  },
  {
    "model": "iPhone 12 Pro Max - 256GB",
    "min_value": 800.0,
    "max_value": 1850.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 500.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 800.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 390.0
      }
    ]
  },
  {
    "model": "iPhone 12 Pro Max - 512GB",
    "min_value": 800.0,
    "max_value": 1850.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 500.0
      },
      {
        "item": "Bateria",
        "amount": 150.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 150.0
      },
      {
        "item": "Câmera traseira",
        "amount": 800.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 110.0
      },
      {
        "item": "Flex Carga",
        "amount": 130.0
      },
      {
        "item": "Codec",
        "amount": 674.5
      },
      {
        "item": "Baseband",
        "amount": 674.5
      },
      {
        "item": "Face ID",
        "amount": 399.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 299.5
      },
      {
        "item": "Carcaça",
        "amount": 390.0
      }
    ]
  },
  {
    "model": "iPhone 13 - 128GB",
    "min_value": 1000.0,
    "max_value": 1600.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 400.0
      },
      {
        "item": "Bateria",
        "amount": 150.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 270.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 220.0
      }
    ]
  },
  {
    "model": "iPhone 13 - 256GB",
    "min_value": 1000.0,
    "max_value": 1800.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 420.0
      },
      {
        "item": "Bateria",
        "amount": 150.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 270.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 220.0
      }
    ]
  },
  {
    "model": "iPhone 13 Mini - 128GB",
    "min_value": 600.0,
    "max_value": 1300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 500.0
      },
      {
        "item": "Bateria",
        "amount": 180.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 270.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 320.0
      }
    ]
  },
  {
    "model": "iPhone 13 Mini - 256GB",
    "min_value": 600.0,
    "max_value": 1350.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 500.0
      },
      {
        "item": "Bateria",
        "amount": 180.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 270.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 320.0
      }
    ]
  },
  {
    "model": "iPhone 13 Mini - 64GB",
    "min_value": 600.0,
    "max_value": 1200.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 500.0
      },
      {
        "item": "Bateria",
        "amount": 180.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 270.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 320.0
      }
    ]
  },
  {
    "model": "iPhone 13 Pro - 128GB",
    "min_value": 1500.0,
    "max_value": 2300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 690.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 410.0
      },
      {
        "item": "Mancha na câmera",
        "amount": 340.0
      }
    ]
  },
  {
    "model": "iPhone 13 Pro - 256GB",
    "min_value": 1500.0,
    "max_value": 2400.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 690.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 410.0
      }
    ]
  },
  {
    "model": "iPhone 13 Pro - 512GB",
    "min_value": 1500.0,
    "max_value": 2500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 690.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 130.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 410.0
      }
    ]
  },
  {
    "model": "iPhone 13 Pro Max - 128GB",
    "min_value": 1500.0,
    "max_value": 2600.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1200.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 160.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 410.0
      }
    ]
  },
  {
    "model": "iPhone 13 Pro Max - 256GB",
    "min_value": 1500.0,
    "max_value": 2700.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1200.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 160.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 410.0
      }
    ]
  },
  {
    "model": "iPhone 13 Pro Max - 512GB",
    "min_value": 1500.0,
    "max_value": 2800.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1200.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 160.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 749.5
      },
      {
        "item": "Baseband",
        "amount": 749.5
      },
      {
        "item": "Face ID",
        "amount": 495.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 349.5
      },
      {
        "item": "Carcaça",
        "amount": 410.0
      }
    ]
  },
  {
    "model": "iPhone 14 - 128GB",
    "min_value": 1500.0,
    "max_value": 1900.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 600.0
      },
      {
        "item": "Bateria",
        "amount": 180.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 170.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 899.5
      },
      {
        "item": "Baseband",
        "amount": 899.5
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 495.0
      },
      {
        "item": "Carcaça",
        "amount": 500.0
      }
    ]
  },
  {
    "model": "iPhone 14 - 256GB",
    "min_value": 1500.0,
    "max_value": 2000.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 899.0
      },
      {
        "item": "Bateria",
        "amount": 180.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 170.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 400.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 200.0
      },
      {
        "item": "Codec",
        "amount": 899.5
      },
      {
        "item": "Baseband",
        "amount": 899.5
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 495.0
      },
      {
        "item": "Carcaça",
        "amount": 500.0
      }
    ]
  },
  {
    "model": "iPhone 14 Plus - 128GB",
    "min_value": 1500.0,
    "max_value": 2000.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 890.0
      },
      {
        "item": "Bateria",
        "amount": 180.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 170.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 600.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 260.0
      },
      {
        "item": "Codec",
        "amount": 1274.5
      },
      {
        "item": "Baseband",
        "amount": 1274.5
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 495.0
      },
      {
        "item": "Carcaça",
        "amount": 500.0
      }
    ]
  },
  {
    "model": "iPhone 14 Plus - 256GB",
    "min_value": 1500.0,
    "max_value": 2100.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 890.0
      },
      {
        "item": "Bateria",
        "amount": 180.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 170.0
      },
      {
        "item": "Câmera frontal",
        "amount": 180.0
      },
      {
        "item": "Câmera traseira",
        "amount": 600.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 260.0
      },
      {
        "item": "Codec",
        "amount": 1274.5
      },
      {
        "item": "Baseband",
        "amount": 1274.5
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 495.0
      },
      {
        "item": "Carcaça",
        "amount": 500.0
      }
    ]
  },
  {
    "model": "iPhone 14 Pro - 128GB",
    "min_value": 1500.0,
    "max_value": 2700.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 890.0
      },
      {
        "item": "Bateria",
        "amount": 210.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 250.0
      },
      {
        "item": "Câmera frontal",
        "amount": 595.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 260.0
      },
      {
        "item": "Codec",
        "amount": 1274.5
      },
      {
        "item": "Baseband",
        "amount": 1274.5
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 595.0
      },
      {
        "item": "Carcaça",
        "amount": 550.0
      }
    ]
  },
  {
    "model": "iPhone 14 Pro - 256GB",
    "min_value": 2500.0,
    "max_value": 2850.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 890.0
      },
      {
        "item": "Bateria",
        "amount": 210.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 250.0
      },
      {
        "item": "Câmera frontal",
        "amount": 250.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 260.0
      },
      {
        "item": "Codec",
        "amount": 1274.5
      },
      {
        "item": "Baseband",
        "amount": 1274.5
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 595.0
      },
      {
        "item": "Carcaça",
        "amount": 550.0
      }
    ]
  },
  {
    "model": "iPhone 14 Pro Max - 128GB",
    "min_value": 2500.0,
    "max_value": 3150.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 890.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 250.0
      },
      {
        "item": "Câmera frontal",
        "amount": 250.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 240.0
      },
      {
        "item": "Codec",
        "amount": 1274.5
      },
      {
        "item": "Baseband",
        "amount": 1274.5
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 595.0
      },
      {
        "item": "Carcaça",
        "amount": 550.0
      }
    ]
  },
  {
    "model": "iPhone 14 Pro Max - 256GB",
    "min_value": 2500.0,
    "max_value": 3250.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 890.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 250.0
      },
      {
        "item": "Câmera frontal",
        "amount": 250.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 240.0
      },
      {
        "item": "Codec",
        "amount": 1345.0
      },
      {
        "item": "Baseband",
        "amount": 1345.0
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 595.0
      },
      {
        "item": "Carcaça",
        "amount": 550.0
      }
    ]
  },
  {
    "model": "iPhone 14 Pro Max - 512GB",
    "min_value": 2500.0,
    "max_value": 3350.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 890.0
      },
      {
        "item": "Bateria",
        "amount": 250.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 250.0
      },
      {
        "item": "Câmera frontal",
        "amount": 250.0
      },
      {
        "item": "Câmera traseira",
        "amount": 750.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 140.0
      },
      {
        "item": "Flex Carga",
        "amount": 240.0
      },
      {
        "item": "Codec",
        "amount": 1345.0
      },
      {
        "item": "Baseband",
        "amount": 1345.0
      },
      {
        "item": "Face ID",
        "amount": 649.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 595.0
      },
      {
        "item": "Carcaça",
        "amount": 550.0
      }
    ]
  },
  {
    "model": "IPhone 15 128GB",
    "min_value": 2200.0,
    "max_value": 2700.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 900.0
      },
      {
        "item": "Bateria",
        "amount": 260.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 210.0
      },
      {
        "item": "Câmera frontal",
        "amount": 560.0
      },
      {
        "item": "Câmera traseira",
        "amount": 460.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 270.0
      },
      {
        "item": "Carcaça",
        "amount": 600.0
      }
    ]
  },
  {
    "model": "IPhone 15 256GB",
    "min_value": 2200.0,
    "max_value": 2600.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 900.0
      },
      {
        "item": "Bateria",
        "amount": 260.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 210.0
      },
      {
        "item": "Câmera frontal",
        "amount": 560.0
      },
      {
        "item": "Câmera traseira",
        "amount": 460.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 270.0
      },
      {
        "item": "Carcaça",
        "amount": 600.0
      }
    ]
  },
  {
    "model": "IPhone 15 plus 128GB",
    "min_value": 2200.0,
    "max_value": 2800.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 900.0
      },
      {
        "item": "Bateria",
        "amount": 260.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 210.0
      },
      {
        "item": "Câmera traseira",
        "amount": 460.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 130.0
      },
      {
        "item": "Flex Carga",
        "amount": 270.0
      },
      {
        "item": "Carcaça",
        "amount": 600.0
      }
    ]
  },
  {
    "model": "IPhone 15 pro 128gb",
    "min_value": 2500.0,
    "max_value": 3200.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 900.0
      },
      {
        "item": "Bateria",
        "amount": 270.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 210.0
      },
      {
        "item": "Câmera frontal",
        "amount": 850.0
      },
      {
        "item": "Câmera traseira",
        "amount": 570.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 210.0
      },
      {
        "item": "Flex Carga",
        "amount": 310.0
      },
      {
        "item": "Carcaça",
        "amount": 600.0
      }
    ]
  },
  {
    "model": "IPhone 15 pro 256gb",
    "min_value": 2500.0,
    "max_value": 3350.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1000.0
      },
      {
        "item": "Bateria",
        "amount": 270.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 210.0
      },
      {
        "item": "Câmera frontal",
        "amount": 850.0
      },
      {
        "item": "Câmera traseira",
        "amount": 570.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 210.0
      },
      {
        "item": "Flex Carga",
        "amount": 310.0
      },
      {
        "item": "Carcaça",
        "amount": 600.0
      }
    ]
  },
  {
    "model": "iPhone 15 Pro Max - 256GB",
    "min_value": 2500.0,
    "max_value": 3800.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1000.0
      },
      {
        "item": "Bateria",
        "amount": 270.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 210.0
      },
      {
        "item": "Câmera frontal",
        "amount": 900.0
      },
      {
        "item": "Câmera traseira",
        "amount": 570.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 260.0
      },
      {
        "item": "Flex Carga",
        "amount": 310.0
      },
      {
        "item": "Carcaça",
        "amount": 600.0
      }
    ]
  },
  {
    "model": "iPhone 15 Pro Max - 512GB",
    "min_value": 2500.0,
    "max_value": 4000.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1200.0
      },
      {
        "item": "Bateria",
        "amount": 270.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 210.0
      },
      {
        "item": "Câmera frontal",
        "amount": 900.0
      },
      {
        "item": "Câmera traseira",
        "amount": 570.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 80.0
      },
      {
        "item": "Flex Power",
        "amount": 260.0
      },
      {
        "item": "Flex Carga",
        "amount": 310.0
      },
      {
        "item": "Carcaça",
        "amount": 600.0
      }
    ]
  },
  {
    "model": "IPhone 16 128gb",
    "min_value": 1500.0,
    "max_value": 3200.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1200.0
      },
      {
        "item": "Bateria",
        "amount": 270.0
      }
    ]
  },
  {
    "model": "IPhone 16 e 128gb",
    "min_value": 1500.0,
    "max_value": 2500.0,
    "deductions": []
  },
  {
    "model": "IPhone 16 pro 128gb",
    "min_value": 2000.0,
    "max_value": 4100.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1200.0
      },
      {
        "item": "Bateria",
        "amount": 270.0
      }
    ]
  },
  {
    "model": "IPhone 16 Pro 256Gb",
    "min_value": 4000.0,
    "max_value": 4250.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1200.0
      },
      {
        "item": "Bateria",
        "amount": 270.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 250.0
      }
    ]
  },
  {
    "model": "iPhone 16 Pro Max 256gb",
    "min_value": 4000.0,
    "max_value": 4900.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1900.0
      },
      {
        "item": "Bateria",
        "amount": 350.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 250.0
      },
      {
        "item": "Carcaça",
        "amount": 900.0
      }
    ]
  },
  {
    "model": "iPhone 17 Pro Max 1T",
    "min_value": 6000.0,
    "max_value": 7000.0,
    "deductions": []
  },
  {
    "model": "iPhone XR - 128GB",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 120.0
      },
      {
        "item": "Bateria",
        "amount": 80.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 120.0
      },
      {
        "item": "Câmera frontal",
        "amount": 100.0
      },
      {
        "item": "Câmera traseira",
        "amount": 170.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 80.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 299.5
      },
      {
        "item": "Baseband",
        "amount": 299.5
      },
      {
        "item": "Face ID",
        "amount": 133.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 149.5
      },
      {
        "item": "Carcaça",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "iPhone XR - 256GB",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 120.0
      },
      {
        "item": "Bateria",
        "amount": 80.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 120.0
      },
      {
        "item": "Câmera frontal",
        "amount": 100.0
      },
      {
        "item": "Câmera traseira",
        "amount": 170.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 80.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 299.5
      },
      {
        "item": "Baseband",
        "amount": 299.5
      },
      {
        "item": "Face ID",
        "amount": 133.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 149.5
      },
      {
        "item": "Carcaça",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "iPhone XR - 64GB",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 120.0
      },
      {
        "item": "Bateria",
        "amount": 80.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 120.0
      },
      {
        "item": "Câmera frontal",
        "amount": 100.0
      },
      {
        "item": "Câmera traseira",
        "amount": 170.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 80.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 299.5
      },
      {
        "item": "Baseband",
        "amount": 299.5
      },
      {
        "item": "Face ID",
        "amount": 133.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 149.5
      },
      {
        "item": "Carcaça",
        "amount": 200.0
      },
      {
        "item": "Mancha na câmera",
        "amount": 40.0
      }
    ]
  },
  {
    "model": "iPhone XS - 256GB",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 180.0
      },
      {
        "item": "Bateria",
        "amount": 100.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 120.0
      },
      {
        "item": "Câmera frontal",
        "amount": 80.0
      },
      {
        "item": "Câmera traseira",
        "amount": 200.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 100.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 133.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 164.5
      },
      {
        "item": "Carcaça",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "iPhone XS - 64GB",
    "min_value": 200.0,
    "max_value": 400.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 180.0
      },
      {
        "item": "Bateria",
        "amount": 100.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 100.0
      },
      {
        "item": "Câmera frontal",
        "amount": 80.0
      },
      {
        "item": "Câmera traseira",
        "amount": 200.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 100.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 133.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 164.5
      },
      {
        "item": "Carcaça",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "iPhone XS Max - 256GB",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 290.0
      },
      {
        "item": "Bateria",
        "amount": 100.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 120.0
      },
      {
        "item": "Câmera frontal",
        "amount": 80.0
      },
      {
        "item": "Câmera traseira",
        "amount": 200.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 100.0
      },
      {
        "item": "Flex Carga",
        "amount": 100.0
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 133.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 164.5
      },
      {
        "item": "Carcaça",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "IPhone XS Max - 512gb",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 290.0
      },
      {
        "item": "Bateria",
        "amount": 100.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 120.0
      },
      {
        "item": "Câmera frontal",
        "amount": 80.0
      },
      {
        "item": "Câmera traseira",
        "amount": 200.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 100.0
      },
      {
        "item": "Flex Carga",
        "amount": 100.0
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 133.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 164.5
      },
      {
        "item": "Carcaça",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "iPhone XS Max - 64GB",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 290.0
      },
      {
        "item": "Bateria",
        "amount": 100.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 120.0
      },
      {
        "item": "Câmera frontal",
        "amount": 80.0
      },
      {
        "item": "Câmera traseira",
        "amount": 200.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 100.0
      },
      {
        "item": "Flex Carga",
        "amount": 100.0
      },
      {
        "item": "Codec",
        "amount": 599.5
      },
      {
        "item": "Baseband",
        "amount": 599.5
      },
      {
        "item": "Face ID",
        "amount": 133.0
      },
      {
        "item": "Sensor de proximidade",
        "amount": 164.5
      },
      {
        "item": "Carcaça",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "MacBook 12' M3 2017 8g 256gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Air 2012 i5 4g 128gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Air 2013 i5 4g 128gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Air 2014 i5 4g 128gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Air 2015 i5 4g 128gb",
    "min_value": 300.0,
    "max_value": 1000.0,
    "deductions": []
  },
  {
    "model": "MacBook Air 2017 i5 4g 128gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Air 2018 i5 4gb 128gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Air 2018 i5 8gb 128gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook AirM1 256GB",
    "min_value": 1000.0,
    "max_value": 2500.0,
    "deductions": []
  },
  {
    "model": "MacBook M3 12 2015 i5 8g 256gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook M3 12 2015 i5 8g 512gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Pro 2011 i5 4G 128Gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Pro 2013",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook Pro 2017 i5 8g 128gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "MacBook PRO M1 256GB",
    "min_value": 1000.0,
    "max_value": 3000.0,
    "deductions": []
  },
  {
    "model": "Novo iPhone SE - 128GB",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 85.0
      },
      {
        "item": "Bateria",
        "amount": 70.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 100.0
      },
      {
        "item": "Câmera frontal",
        "amount": 60.0
      },
      {
        "item": "Câmera traseira",
        "amount": 100.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 60.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 349.5
      },
      {
        "item": "Baseband",
        "amount": 349.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 149.5
      },
      {
        "item": "Carcaça",
        "amount": 149.5
      }
    ]
  },
  {
    "model": "Novo iPhone SE - 256GB",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 85.0
      },
      {
        "item": "Bateria",
        "amount": 70.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 100.0
      },
      {
        "item": "Câmera frontal",
        "amount": 60.0
      },
      {
        "item": "Câmera traseira",
        "amount": 100.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 60.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 349.5
      },
      {
        "item": "Baseband",
        "amount": 349.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 149.5
      },
      {
        "item": "Carcaça",
        "amount": 149.5
      }
    ]
  },
  {
    "model": "Novo iPhone SE - 64GB",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 85.0
      },
      {
        "item": "Bateria",
        "amount": 70.0
      },
      {
        "item": "Vidro traseiro",
        "amount": 100.0
      },
      {
        "item": "Câmera frontal",
        "amount": 60.0
      },
      {
        "item": "Câmera traseira",
        "amount": 100.0
      },
      {
        "item": "Vidro da câmera traseira",
        "amount": 50.0
      },
      {
        "item": "Flex Power",
        "amount": 60.0
      },
      {
        "item": "Flex Carga",
        "amount": 90.0
      },
      {
        "item": "Codec",
        "amount": 349.5
      },
      {
        "item": "Baseband",
        "amount": 349.5
      },
      {
        "item": "Sensor de proximidade",
        "amount": 149.5
      },
      {
        "item": "Carcaça",
        "amount": 149.5
      }
    ]
  },
  {
    "model": "Watch 4 - 40mm",
    "min_value": 200.0,
    "max_value": 400.0,
    "deductions": [
      {
        "item": "Carcaça",
        "amount": 405.0
      }
    ]
  },
  {
    "model": "Watch 4 - 44mm",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Carcaça",
        "amount": 405.0
      }
    ]
  },
  {
    "model": "Watch 5 - 40mm",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Carcaça",
        "amount": 405.0
      }
    ]
  },
  {
    "model": "Watch 5 - 44mm",
    "min_value": 200.0,
    "max_value": 600.0,
    "deductions": [
      {
        "item": "Carcaça",
        "amount": 405.0
      }
    ]
  },
  {
    "model": "Watch 6 - 40mm",
    "min_value": 300.0,
    "max_value": 700.0,
    "deductions": []
  },
  {
    "model": "Watch 6 - 44mm",
    "min_value": 300.0,
    "max_value": 800.0,
    "deductions": []
  },
  {
    "model": "Watch 7 - 41mm",
    "min_value": 300.0,
    "max_value": 800.0,
    "deductions": []
  },
  {
    "model": "Watch 7 - 45mm",
    "min_value": 300.0,
    "max_value": 900.0,
    "deductions": []
  },
  {
    "model": "Watch 8 - 41mm",
    "min_value": 300.0,
    "max_value": 850.0,
    "deductions": []
  },
  {
    "model": "Watch 8 - 45mm GPS + CEL",
    "min_value": 300.0,
    "max_value": 850.0,
    "deductions": []
  },
  {
    "model": "Watch 9 - 41mm",
    "min_value": 500.0,
    "max_value": 900.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "Watch 9 - 45mm",
    "min_value": 500.0,
    "max_value": 900.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 200.0
      }
    ]
  },
  {
    "model": "Watch SE - 40mm",
    "min_value": 300.0,
    "max_value": 600.0,
    "deductions": []
  },
  {
    "model": "Watch SE - 44mm",
    "min_value": 300.0,
    "max_value": 700.0,
    "deductions": []
  },
  {
    "model": "Watch SE 2- 40mm",
    "min_value": 300.0,
    "max_value": 800.0,
    "deductions": []
  },
  {
    "model": "Watch SE 2- 44mm",
    "min_value": 300.0,
    "max_value": 900.0,
    "deductions": []
  },
  {
    "model": "Watch Ultra 2 - 49mm",
    "min_value": 2000.0,
    "max_value": 2700.0,
    "deductions": []
  },
  {
    "model": "edge 30",
    "min_value": 200.0,
    "max_value": 200.0,
    "deductions": []
  },
  {
    "model": "Moto G100",
    "min_value": 500.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "moto G50 5G",
    "min_value": 300.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "Moto G52",
    "min_value": 300.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "Moto G60",
    "min_value": 400.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "Moto G82",
    "min_value": 100.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "A03s",
    "min_value": 0,
    "max_value": 250.0,
    "deductions": []
  },
  {
    "model": "A10",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "A10s",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "A11",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 280.0
      }
    ]
  },
  {
    "model": "A12",
    "min_value": 100.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "A20",
    "min_value": 50.0,
    "max_value": 150.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 700.0
      }
    ]
  },
  {
    "model": "A20s",
    "min_value": 50.0,
    "max_value": 150.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 700.0
      }
    ]
  },
  {
    "model": "A21s",
    "min_value": 100.0,
    "max_value": 200.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 210.0
      }
    ]
  },
  {
    "model": "A30",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 700.0
      }
    ]
  },
  {
    "model": "A30s",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 700.0
      }
    ]
  },
  {
    "model": "A31 / A31s",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 910.0
      }
    ]
  },
  {
    "model": "A32",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 910.0
      }
    ]
  },
  {
    "model": "A50",
    "min_value": 100.0,
    "max_value": 400.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 770.0
      }
    ]
  },
  {
    "model": "A51",
    "min_value": 100.0,
    "max_value": 400.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 770.0
      }
    ]
  },
  {
    "model": "A52",
    "min_value": 100.0,
    "max_value": 400.0,
    "deductions": []
  },
  {
    "model": "A53",
    "min_value": 100.0,
    "max_value": 400.0,
    "deductions": []
  },
  {
    "model": "A70",
    "min_value": 100.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 910.0
      }
    ]
  },
  {
    "model": "A71",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 980.0
      }
    ]
  },
  {
    "model": "A72",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 588.0
      }
    ]
  },
  {
    "model": "A80",
    "min_value": 100.0,
    "max_value": 500.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 980.0
      }
    ]
  },
  {
    "model": "Galaxy A01",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Galaxy A02",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Galaxy M31",
    "min_value": 100.0,
    "max_value": 400.0,
    "deductions": []
  },
  {
    "model": "Galaxy M32",
    "min_value": 100.0,
    "max_value": 400.0,
    "deductions": []
  },
  {
    "model": "Galaxy Note 9",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Galaxy S7",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Galaxy Watch s1 - 46mm",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Gran Duos",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Gran Prime Duos",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "J4+",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 322.0
      }
    ]
  },
  {
    "model": "J5",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 154.0
      }
    ]
  },
  {
    "model": "J6",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "J7",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 154.0
      }
    ]
  },
  {
    "model": "J7 Prime",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 154.0
      }
    ]
  },
  {
    "model": "J7 Pro",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 154.0
      }
    ]
  },
  {
    "model": "J8",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "M30",
    "min_value": 100.0,
    "max_value": 300.0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 252.0
      }
    ]
  },
  {
    "model": "M53",
    "min_value": 400.0,
    "max_value": 600.0,
    "deductions": []
  },
  {
    "model": "M54",
    "min_value": 400.0,
    "max_value": 700.0,
    "deductions": []
  },
  {
    "model": "Note 10",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Note 10 Lite",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Note 10+",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Note 20",
    "min_value": 500.0,
    "max_value": 700.0,
    "deductions": []
  },
  {
    "model": "Note 20 - Ultra",
    "min_value": 500.0,
    "max_value": 800.0,
    "deductions": []
  },
  {
    "model": "S10",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "S10+",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "S10e",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "S20",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "S20 Ultra",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "S20+",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "S20Fe",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "S21",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "S21 +",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "S21 Ultra",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "S21Fe",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "S22",
    "min_value": 200.0,
    "max_value": 600.0,
    "deductions": []
  },
  {
    "model": "S24 Ultra",
    "min_value": 2300.0,
    "max_value": 3000.0,
    "deductions": []
  },
  {
    "model": "S25 ULTRA",
    "min_value": 1800.0,
    "max_value": 2200.0,
    "deductions": []
  },
  {
    "model": "S8",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1120.0
      }
    ]
  },
  {
    "model": "S8+",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1470.0
      }
    ]
  },
  {
    "model": "S9",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1400.0
      }
    ]
  },
  {
    "model": "S9+",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 1680.0
      }
    ]
  },
  {
    "model": "Samsung Active",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Samsung Active 2",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Samsung S23 Fe",
    "min_value": 200.0,
    "max_value": 800.0,
    "deductions": []
  },
  {
    "model": "Z Flip 3",
    "min_value": 200.0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "Mi 10 lite",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi 8",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi 8 lite",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "Mi 9",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 910.0
      }
    ]
  },
  {
    "model": "Mi 9 Lite",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi 9 SE",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi 9T",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi A2",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi A3",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi Band 1",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi Band 4",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Mi Band 5",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Note 13 256/8gb",
    "min_value": 0,
    "max_value": 500.0,
    "deductions": []
  },
  {
    "model": "Note 7",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "Note 9",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Note 9 Pro",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Note 9s",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Poco F1",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "Poco F3 128gb 6gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "Poco M3",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "Poco X3",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "Poco X3 Pro",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 182.0
      }
    ]
  },
  {
    "model": "Poco X4 Pro 5G 256gb/8gb",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Poco X6 Pro 256gb",
    "min_value": 600.0,
    "max_value": 700.0,
    "deductions": []
  },
  {
    "model": "POCO X8 PRO MAX",
    "min_value": 900.0,
    "max_value": 1600.0,
    "deductions": []
  },
  {
    "model": "Redmi 12c",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Redmi 6",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 140.0
      }
    ]
  },
  {
    "model": "Redmi 7 A",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 140.0
      }
    ]
  },
  {
    "model": "Redmi 9",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Redmi 9T",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Redmi Note 10",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Redmi Note 10 Pro",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Redmi Note 11",
    "min_value": 50.0,
    "max_value": 300.0,
    "deductions": []
  },
  {
    "model": "Redmi Note 11 pro",
    "min_value": 50.0,
    "max_value": 300.0,
    "deductions": []
  },
  {
    "model": "Redmi Note 12 Pro 5G",
    "min_value": 0,
    "max_value": 0,
    "deductions": []
  },
  {
    "model": "Redmi Note 6 Pro",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 140.0
      }
    ]
  },
  {
    "model": "Redmi Note 8",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 320.0
      }
    ]
  },
  {
    "model": "Redmi Note 8 Pro",
    "min_value": 0,
    "max_value": 0,
    "deductions": [
      {
        "item": "Tela",
        "amount": 320.0
      }
    ]
  }
];

(async () => {
  console.log('Fazendo login...');
  const login = await request('POST', '/auth/login', { email: EMAIL, password: PASS });
  const token = login.accessToken;
  if (!token) { console.error('Login falhou:', login); process.exit(1); }
  console.log('Login OK');

  console.log('Inserindo', RULES.length, 'regras de troca...');
  const result = await request('POST', '/trades/import', { rules: RULES }, token);
  console.log('Resultado:', result);

  if (result.ok) {
    console.log('✅ Inserido:', result.inserted, '| Ignorado:', result.skipped);
  } else {
    console.error('❌ Erro:', result);
  }
})().catch(console.error);
