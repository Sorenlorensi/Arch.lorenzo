# Arch.Lorenzo na Vercel

Site: public/index.html | Painel: /admin (link "Área do escritório" no rodapé) | API: api/[...path].js

## Passo a passo
1. Envie ao GitHub o CONTEÚDO desta pasta (public, api, package.json, vercel.json). Na raiz do repositório não pode haver uma pasta "archlorenzo" por fora, nem o .zip.
2. Vercel > Add New > Project > escolha o repositório > Framework "Other" > Deploy.
3. Banco de dados: no projeto, aba Storage > Create Database > Neon (Postgres) > conecte ao projeto, para todos os ambientes.
   Isso cria a variável DATABASE_URL sozinha. As tabelas são criadas automaticamente no primeiro acesso.
4. Settings > Environment Variables, crie:
   ADMIN_PASSWORD = senha do painel
   SECRET = texto longo e aleatório (40+ letras e números)
5. Deployments > ... > Redeploy (para aplicar as variáveis).
6. Abra seusite.vercel.app/admin, entre e cadastre os projetos.
7. Domínio: Settings > Domains > adicione archlorenzo.com.br e www.archlorenzo.com.br e copie os registros DNS que a Vercel mostrar.
