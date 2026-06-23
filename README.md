# Portal Loja 62

Portal interno para a Loja 62 com páginas gerais, área dos líderes e área administrativa.

## Recursos

- Login com perfis: Desenvolvedor, Gerente, Lider e Colaborador.
- Permissões: Admin, Lider e Usuário.
- Férias mensais com boxes por mês/ano e CRUD para admin.
- Aniversariantes mensais com boxes por mês/ano e CRUD para admin.
- Cardápio diário por mês/ano com CRUD e importação de PDF.
- Calculadoras de ponto 7h20m e 8h48m.
- Atalho para Apex.
- Gerador de escala 5x2 por mês, mínimos por período e objeções.
- Admin de usuários e permissões.
- Portal do Cartazista integrado com Pedido de Cartaz em PDF, anotações e atalhos oficiais.
- Página 404 personalizada.
- Dados sincronizados com Firebase/Firestore quando configurado.
- Fallback local via localStorage enquanto o Firebase ainda não estiver configurado.

## Contas de teste

No Firebase Auth, as contas iniciais usam a senha temporária `Loja62@2026`.

- `desenvolvedor@loja62.com` - Desenvolvedor / Admin
- `gerente@loja62.com` - Gerente / Admin
- `lider@loja62.com` - Lider / Lider
- `colaborador@loja62.com` - Colaborador / Usuário

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:5173/`.

## Configurar Firebase

1. Crie um projeto no Firebase.
2. Adicione um app Web no projeto.
3. Copie as chaves de configuração do app Web.
4. Copie `.env.example` para `.env.local`.
5. Preencha as variáveis `VITE_FIREBASE_*` em `.env.local`.
6. Ative o Firestore Database no console do Firebase.
7. Se quiser login real, ative Authentication > Email/Senha e coloque `VITE_FIREBASE_AUTH_ENABLED=true`.
8. Crie no Firebase Auth os mesmos emails cadastrados no portal.

O portal usa o documento `portal/loja62` no Firestore para guardar:

- usuários e permissões;
- férias;
- aniversariantes;
- cardápios.

Regras recomendadas estão em `firestore.rules`.

Enquanto `VITE_FIREBASE_AUTH_ENABLED=false`, o portal usa o login local cadastrado na tela de usuários. Para uso real entre várias pessoas, prefira `true`.

## Validação

```bash
npm run lint
npm run build
```

O build pode avisar que o bundle ficou grande porque o leitor de PDF roda no navegador.
