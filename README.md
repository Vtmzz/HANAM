# Haname — pronto para GitHub Pages

Esta cópia publica uma **demonstração estática** do Haname. O workflow em `.github/workflows/pages.yml` publica somente a pasta `site/` quando há envio para `main` ou `master`.

## Limites importantes

GitHub Pages não executa PHP; esta versão não inclui o backend nem os JSON mutáveis. As alterações ficam somente no `localStorage` do navegador e não são compartilhadas entre pessoas ou dispositivos. **Não use dados reais de pacientes, saúde, pagamentos, senhas ou outras informações pessoais.** Autenticação, perfis e permissões são executados no navegador, cujo código é público; não são controles de segurança de produção.

Algumas fontes de imagens não identificam completamente autoria/licença. Confirme os direitos antes de publicar comercialmente; consulte `site/assets/fontes-imagens.md`.

## Envio pelo site do GitHub

1. Extraia o ZIP em uma pasta.
2. No GitHub, crie um repositório novo, de preferência público, sem adicionar README, licença ou `.gitignore`.
3. No repositório, escolha **Add file → Upload files**. Envie `README.md`, `.gitignore` e a pasta `site/` extraída. Não envie o ZIP como arquivo único.
4. A pasta `.github` pode estar oculta e não aparecer no seletor. Nesse caso, escolha **Add file → Create new file**. No campo do nome, digite `.github/workflows/pages.yml`. Abra o arquivo local com esse mesmo caminho, copie todo o conteúdo e cole no editor do GitHub. Clique em **Commit changes**.
5. Se ainda não tiver feito, clique em **Commit changes** na tela de upload para salvar os arquivos do site na branch `main`.
6. Abra **Settings → Pages** e, em **Build and deployment → Source**, selecione **GitHub Actions**.
7. Abra **Actions** e aguarde `Deploy Haname to GitHub Pages` terminar com sucesso. O endereço estará no job ou em **Settings → Pages**; geralmente será `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Se preferir, Git ou GitHub Desktop também enviam a pasta oculta `.github` automaticamente. Não misture os arquivos do ZIP original: esta cópia foi filtrada e o workflow publica somente `site/`.
