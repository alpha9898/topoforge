.PHONY: install dev-backend dev-frontend test typecheck build

install:
	python -m pip install -r backend/requirements.txt
	cd frontend && npm install

dev-backend:
	cd backend && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001

dev-frontend:
	cd frontend && NEXT_PUBLIC_API_BASE=http://localhost:8001 npm run dev -- -p 3001

test:
	python -m pytest backend/tests -c backend/pytest.ini
	cd frontend && npm run test

typecheck:
	cd frontend && npm run typecheck

build:
	cd frontend && npm run build
