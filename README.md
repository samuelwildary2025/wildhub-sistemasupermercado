# Sistema de Supermercado Queiroz — Guia Rápido

Aplicação multi-tenant para gestão de pedidos de supermercados.
Backend em FastAPI e frontend em React (Vite).

## Pré-requisitos

- `Python 3.10+` e `pip`
- `Node.js 18+` e `npm`
- (Opcional) `Docker` e `Docker Compose`

## Desenvolvimento Local

### Backend (FastAPI)
- `cd backend`
- `python -m venv .venv && source .venv/bin/activate`
- `pip install -r requirements.txt`
- `uvicorn main:app --reload --port 8000`
- API Docs: `http://localhost:8000/docs`

### Frontend (React + Vite)
- `cd frontend`
- `npm install`
- Configure o backend URL criando `frontend/.env.local` com:
  - `VITE_API_BASE_URL=http://localhost:8000`
- Desenvolvimento: `npm run dev -- --port 4175`
- Build: `npm run build`
- Preview de produção: `npm run preview -- --port 4173` (abre em `http://localhost:4173`)

## Docker (opcional)

- `docker-compose up --build -d`
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

## Impressão Térmica (80mm)

- No painel de pedidos, use o botão `Imprimir` no cartão do pedido.
- O recibo inclui: loja, data, pedido, itens em duas linhas, total, forma de pagamento e observações.
- Campos usados:
  - Forma de pagamento: `pedido.forma`
  - Observações: `pedido.observacao` ou `pedido.observacoes`
  - Nome da loja: `localStorage.user.nome`
- Para 58mm, ajuste em `frontend/src/components/PedidoCard.jsx`:
  - `@page { size: 58mm auto; }` e `body { width: 58mm; }`

## Variáveis de Ambiente

- Frontend (Vite): `VITE_API_BASE_URL`
- Backend (Docker Compose): `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`

## Endpoints principais

- `POST /api/auth/login` — Login (`email`, `senha`)
- `GET /api/pedidos` — Lista pedidos (aceita `status`, `tenant_id`)
- `POST /api/pedidos` — Cria pedido
- `PUT /api/pedidos/{id}` — Atualiza pedido
- `DELETE /api/pedidos/{id}` — Remove pedido
- `GET /api/supermarkets` — Lista supermercados (aceita `tenant_id`)
- `GET /api/supermarkets/{id}` — Detalhes do supermercado

## Dicas rápidas

- Se o dev server do frontend estiver em outra porta, atualize `VITE_API_BASE_URL` pela `.env.local`.
- Em caso de erro 401, o frontend limpa `token`/`user` e redireciona para `/login`.
- Para testar criação de pedido via API, veja `http://localhost:8000/docs`.

## Scripts úteis

- Frontend: `npm run dev`, `npm run build`, `npm run preview`
- Backend: `uvicorn main:app --reload --port 8000`

## Estrutura (resumo)

```
sistema-supermercado/
├── backend/            # FastAPI
├── frontend/           # React + Vite
├── docker-compose.yml
└── init.sql
```

### Logs
- Logs estruturados no backend
- Tratamento de erros centralizado
- Monitoramento de performance

### Métricas
- Dashboard com estatísticas em tempo real
- Gráficos de vendas e pedidos
- Análise de performance por supermercado

## 🚀 Deploy em Produção

### Docker Compose
```bash
# Para produção, use:
docker-compose -f docker-compose.prod.yml up -d
```

### Configurações de Produção
1. Altere as senhas padrão
2. Configure SSL/TLS
3. Use um banco PostgreSQL dedicado
4. Configure backup automático
5. Monitore logs e métricas

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema:

- **Email:** suporte@supermercadoqueiroz.com
- **Documentação da API:** http://localhost:8000/docs
- **Issues:** Abra uma issue no repositório

## 🔄 Atualizações

### Versão 1.0.0
- ✅ Sistema de autenticação multi-tenant
- ✅ CRUD completo de supermercados e pedidos
- ✅ Dashboard administrativo
- ✅ Analytics com gráficos
- ✅ Interface responsiva com tema escuro
- ✅ Containerização com Docker

### Próximas Versões
- 🔄 Sistema de notificações em tempo real
- 🔄 Relatórios em PDF
- 🔄 Integração com sistemas de pagamento
- 🔄 App mobile React Native
- 🔄 Sistema de backup automático