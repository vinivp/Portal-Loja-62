    function adicionarLinha() {
      const tabela = document.getElementById("tabelaCarga");
      const novaLinha = document.createElement("tr");
      novaLinha.innerHTML = `
        <td><input type="checkbox"></td>
        <td><input type="number" class="form-control" placeholder="Ex: 1"></td>
        <td><input type="text" class="form-control" placeholder="Produto"></td>
        <td><input type="text" class="form-control" placeholder="Marca"></td>
        <td><input type="text" class="form-control" placeholder="Peso"></td>
      `;
      tabela.appendChild(novaLinha);
    }

    function limparTabela() {
      const linhas = document.querySelectorAll("#tabelaCarga tr");
      linhas.forEach(linha => {
        const inputs = linha.querySelectorAll("input");
        inputs.forEach(input => {
          if (input.type === "checkbox") {
            input.checked = false;
          } else {
            input.value = "";
          }
        });
      });
    }

    function restaurarAnotacoes() {
      if (confirm("Deseja realmente limpar todas as anotações?")) {
        limparTabela();
      }
    }