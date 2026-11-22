# Spotlife

Primeira etapa de um projeto de reprodutor de música. Você pode criar uma conta,
entrar, ouvir música na página inicial e sair.

## Como rodar no Windows

Com o Python 3.10 ou superior instalado, extraia o ZIP e abra a pasta
`Spotlife` no VS Code. Abra um terminal nessa pasta e execute:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Se o Windows reconhecer `py` em vez de `python`, use
`py -m venv .venv` no primeiro comando.

Abra [http://127.0.0.1:5000](http://127.0.0.1:5000) no navegador. Crie uma
conta com um e-mail de teste, saia e entre novamente para conferir o fluxo.
Use Ctrl+C no terminal para parar o servidor.

## Por onde começar a ler o código

| Arquivo | Papel |
| --- | --- |
| `templates/auth.html` | Formulários de cadastro e login. |
| `static/styles.css` | Cores, layout, arte do disco e adaptação a telas menores. |
| `static/app.js` | Mostra ou oculta a senha e compara os dois campos no cadastro. |
| `app.py` | Valida o formulário, guarda a conta no SQLite e mantém a sessão. |

No cadastro, o navegador envia o formulário para `POST /cadastro`. O Flask
valida os campos, salva o nome, o e-mail e o hash da senha no SQLite, e leva
você para `/inicio`. No login, o Flask compara a senha digitada com o hash já
guardado.

O banco `instance/spotlife.sqlite3` é criado automaticamente no primeiro uso.
As contas permanecem no banco quando você fecha o servidor. Por padrão, você
entra novamente quando reinicia o servidor, pois a chave da sessão é renovada.
Para manter sessões entre reinicializações, defina uma chave própria e estável
na variável de ambiente `SPOTLIFE_SECRET_KEY`.

Este projeto usa o servidor de desenvolvimento do Flask para execução local.

## Interface depois do login

A rota `/inicio` abre o catálogo Spotlife. Há uma versão com três colunas
para telas largas, uma fila recolhível para tablets e uma navegação inferior
para celulares. A busca e os filtros funcionam sobre um catálogo de seis
faixas. As curtidas duram enquanto a página
está aberta.

`templates/welcome.html` define o catálogo e a página. `static/player.css`
cuida do layout e `static/player.js` controla o áudio, a fila e os filtros.
As capas são regiões da imagem de referência, selecionadas por CSS.

Os áudios ficam em `static/tracks`. O campo `id` em `templates/welcome.html`
corresponde ao nome do arquivo, sem a extensão `.wav`.
