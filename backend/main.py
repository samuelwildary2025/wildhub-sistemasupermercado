#!/usr/bin/env python3
"""
MAIN FORCE DEBUG - Para identificar problema no EasyPanel
Este arquivo substitui temporariamente o main.py para forçar debug
"""

import os
import sys
from datetime import datetime

print("=" * 80)
print(f"🚀 MAIN FORCE DEBUG INICIADO - {datetime.now()}")
print("=" * 80)

print(f"📁 Diretório atual: {os.getcwd()}")
print(f"🐍 Python version: {sys.version}")
print(f"📦 Python path: {sys.path}")

# Verificar variáveis de ambiente
print("\n🔧 VARIÁVEIS DE AMBIENTE:")
env_vars = ['DATABASE_URL', 'SECRET_KEY', 'ALGORITHM', 'ACCESS_TOKEN_EXPIRE_MINUTES', 'DEBUG']
for var in env_vars:
    value = os.getenv(var, 'NÃO DEFINIDA')
    if 'SECRET' in var or 'PASSWORD' in var:
        value = '***OCULTA***' if value != 'NÃO DEFINIDA' else value
    print(f"  {var}: {value}")

print("\n📂 ARQUIVOS NO DIRETÓRIO:")
for item in sorted(os.listdir('.')):
    if os.path.isfile(item):
        print(f"  📄 {item}")
    else:
        print(f"  📁 {item}/")

try:
    print("\n🔄 Importando FastAPI...")
    from fastapi import FastAPI
    print("✅ FastAPI importado com sucesso!")
    
    print("\n🔄 Criando app FastAPI...")
    app = FastAPI(
        title="🔍 FORCE DEBUG - Supermercado Queiroz API",
        description="Versão de debug forçado para identificar problemas",
        version="DEBUG-1.0.0"
    )
    print("✅ App FastAPI criado!")
    
    @app.get("/")
    def read_root():
        return {
            "message": "🔍 FORCE DEBUG - Sistema funcionando!",
            "timestamp": datetime.now().isoformat(),
            "debug": True,
            "python_version": sys.version,
            "cwd": os.getcwd()
        }
    
    @app.get("/debug/info")
    def debug_info():
        return {
            "environment_variables": {
                "DATABASE_URL": "***PRESENTE***" if os.getenv('DATABASE_URL') else "AUSENTE",
                "SECRET_KEY": "***PRESENTE***" if os.getenv('SECRET_KEY') else "AUSENTE",
            },
            "python_path": sys.path,
            "current_directory": os.getcwd(),
            "files_in_directory": os.listdir('.'),
            "timestamp": datetime.now().isoformat()
        }
    
    print("✅ Rotas básicas criadas!")
    
    # Tentar importar e incluir rotas uma por uma
    routes_loaded = []
    routes_failed = []
    
    try:
        print("\n🔄 Tentando importar database...")
        from database import get_db, engine
        from sqlalchemy import text
        print("✅ Database importado!")
        
        print("🔄 Testando conexão com banco...")
        db = next(get_db())
        db.execute(text("SELECT 1"))
        print("✅ Conexão com banco funcionando!")
        
    except Exception as e:
        print(f"❌ ERRO no database: {e}")
        import traceback
        traceback.print_exc()
    
    try:
        print("\n🔄 Tentando importar rotas de auth...")
        from routes.auth import router as auth_router
        app.include_router(auth_router)
        routes_loaded.append("auth")
        print("✅ Rotas de auth carregadas!")
    except Exception as e:
        routes_failed.append(f"auth: {e}")
        print(f"❌ ERRO nas rotas de auth: {e}")
        import traceback
        traceback.print_exc()
    
    try:
        print("\n🔄 Tentando importar rotas de supermarkets...")
        from routes.supermarkets import router as supermarkets_router
        app.include_router(supermarkets_router)
        routes_loaded.append("supermarkets")
        print("✅ Rotas de supermarkets carregadas!")
    except Exception as e:
        routes_failed.append(f"supermarkets: {e}")
        print(f"❌ ERRO nas rotas de supermarkets: {e}")
        import traceback
        traceback.print_exc()
    
    try:
        print("\n🔄 Tentando importar rotas de pedidos...")
        from routes.pedidos import router as pedidos_router
        app.include_router(pedidos_router)
        routes_loaded.append("pedidos")
        print("✅ Rotas de pedidos carregadas!")
    except Exception as e:
        routes_failed.append(f"pedidos: {e}")
        print(f"❌ ERRO nas rotas de pedidos: {e}")
        import traceback
        traceback.print_exc()

    try:
        print("\n🔄 Tentando importar rotas de clientes...")
        from routes.clientes import router as clientes_router
        app.include_router(clientes_router)
        routes_loaded.append("clientes")
        print("✅ Rotas de clientes carregadas!")
    except Exception as e:
        routes_failed.append(f"clientes: {e}")
        print(f"❌ ERRO nas rotas de clientes: {e}")
        import traceback
        traceback.print_exc()

    try:
        print("\n🔄 Tentando importar rotas de financeiro...")
        from routes.financeiro import router as financeiro_router
        app.include_router(financeiro_router)
        routes_loaded.append("financeiro")
        print("✅ Rotas de financeiro carregadas!")
    except Exception as e:
        routes_failed.append(f"financeiro: {e}")
        print(f"❌ ERRO nas rotas de financeiro: {e}")
        import traceback
        traceback.print_exc()

    @app.get("/debug/routes")
    def debug_routes():
        return {
            "routes_loaded": routes_loaded,
            "routes_failed": routes_failed,
            "total_routes": len(app.routes),
            "route_paths": [route.path for route in app.routes if hasattr(route, 'path')]
        }
    
    print(f"\n📊 RESUMO:")
    print(f"  ✅ Rotas carregadas: {routes_loaded}")
    print(f"  ❌ Rotas com erro: {routes_failed}")
    print(f"  📝 Total de rotas: {len(app.routes)}")
    
    print("\n" + "=" * 80)
    print("🎯 MAIN FORCE DEBUG CARREGADO COM SUCESSO!")
    print("=" * 80)

except Exception as e:
    print(f"\n💥 ERRO CRÍTICO NO MAIN FORCE DEBUG: {e}")
    import traceback
    traceback.print_exc()
    
    # Criar app mínimo mesmo com erro
    from fastapi import FastAPI
    app = FastAPI(title="❌ ERROR DEBUG")
    
    @app.get("/")
    def error_root():
        return {"error": str(e), "message": "Erro crítico no carregamento"}

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Iniciando servidor uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=8000)