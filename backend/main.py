from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
from sqlalchemy import text
from models import User, Supermarket, Pedido, ItemPedido
from models.user import User as UserModel
from models.supermarket import SupermarketHistory
from models.cliente import Cliente
from routes import auth_router, supermarkets_router, pedidos_router
from routes.financeiro import router as financeiro_router
from routes.clientes import router as clientes_router
from auth.jwt_handler import get_password_hash

# Criar tabelas
UserModel.metadata.create_all(bind=engine)
Supermarket.metadata.create_all(bind=engine)
Pedido.metadata.create_all(bind=engine)
ItemPedido.metadata.create_all(bind=engine)
SupermarketHistory.metadata.create_all(bind=engine)
Cliente.metadata.create_all(bind=engine)

app = FastAPI(
    title="Supermercado Queiroz - API",
    description="Sistema SaaS de Gestão de Pedidos para Supermercados",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:4175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas
app.include_router(auth_router)
app.include_router(supermarkets_router)
app.include_router(pedidos_router)
app.include_router(financeiro_router)
app.include_router(clientes_router)

@app.get("/")
def read_root():
    return {"message": "Supermercado Queiroz - API funcionando!"}

@app.on_event("startup")
async def startup_event():
    """Criar usuário admin inicial se não existir"""
    db = next(get_db())
    # Garantir colunas extras no SQLite para Pedido (forma, endereco, observacao)
    try:
        dialect = db.bind.dialect.name if db.bind is not None else ""
        if dialect == "sqlite":
            cols = db.execute(text("PRAGMA table_info('pedidos')")).fetchall()
            existing = {row[1] for row in cols}  # name está na posição 1
            to_add = []
            if 'forma' not in existing:
                to_add.append("ALTER TABLE pedidos ADD COLUMN forma VARCHAR")
            if 'endereco' not in existing:
                to_add.append("ALTER TABLE pedidos ADD COLUMN endereco VARCHAR")
            if 'observacao' not in existing:
                to_add.append("ALTER TABLE pedidos ADD COLUMN observacao VARCHAR")
            for stmt in to_add:
                db.execute(text(stmt))
            if to_add:
                db.commit()
    except Exception:
        # Evitar travar startup por erro de migração em runtime
        pass
    
    # Verificar se já existe um admin
    admin_user = db.query(UserModel).filter(UserModel.email == "admin@admin.com").first()
    
    if not admin_user:
        # Criar usuário admin
        admin_user = UserModel(
            nome="Administrador",
            email="admin@admin.com",
            senha_hash=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        print("✅ Usuário admin criado: admin@admin.com / admin123")
    else:
        print("✅ Usuário admin já existe")
    
    db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)