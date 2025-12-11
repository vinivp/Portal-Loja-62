    // --- Seção 1: Hora de saída ---
    document.getElementById("calcForm").addEventListener("submit", function(e) {
      e.preventDefault();

      const horaChegada = document.getElementById("horaChegada").value;
      const intervaloHoras = parseInt(document.getElementById("intervaloHoras").value) || 0;
      const intervaloMinutos = parseInt(document.getElementById("intervaloMinutos").value) || 0;

      if (!horaChegada) { alert("Informe a hora de chegada."); return; }

      const [hora, minuto] = horaChegada.split(":").map(Number);
      const chegadaMinutos = hora * 60 + minuto;
      const jornada = 7 * 60 + 20; // 7h20 = 440 min
      const intervaloTotal = intervaloHoras * 60 + intervaloMinutos;

      const saidaMinutos = chegadaMinutos + jornada + intervaloTotal;
      const saidaHora = Math.floor(saidaMinutos / 60) % 24;
      const saidaMinuto = saidaMinutos % 60;
      const saidaFormatada = String(saidaHora).padStart(2,"0")+":"+String(saidaMinuto).padStart(2,"0");

      document.getElementById("resultadoSaida").innerHTML = "⏰ Hora de saída: <span class='alert-ok'>"+saidaFormatada+"</span>";

      // Atualiza resumo
      document.getElementById("resumoChegada").textContent = horaChegada;
      document.getElementById("resumoSaidaFinal").textContent = saidaFormatada;
    });

    // --- Seção 2: Retorno do almoço/janta ---
    document.getElementById("formAlmoco").addEventListener("submit", function(e) {
      e.preventDefault();

      const horaSaida = document.getElementById("horaSaidaAlmoco").value;
      const horas = parseInt(document.getElementById("tempoHoras").value) || 0;
      const minutos = parseInt(document.getElementById("tempoMinutos").value) || 0;

      if (!horaSaida) { alert("Informe a hora de saída para almoço/janta."); return; }

      const intervaloTotal = horas * 60 + minutos;

      // Validação visual
      if (intervaloTotal < 70 || intervaloTotal > 119) {
        document.getElementById("resultadoAlmoco").innerHTML =
          "⚠️ <span class='alert-erro'>O intervalo deve ser entre 1h10 e 1h59. Você informou "+horas+"h"+minutos+"m.</span>";
        return;
      }

      const [h, m] = horaSaida.split(":").map(Number);
      const saidaMinutos = h * 60 + m;
      const retornoMinutos = saidaMinutos + intervaloTotal;
      const retornoHora = Math.floor(retornoMinutos / 60) % 24;
      const retornoMinuto = retornoMinutos % 60;
      const retornoFormatado = String(retornoHora).padStart(2,"0")+":"+String(retornoMinuto).padStart(2,"0");

      document.getElementById("resultadoAlmoco").innerHTML = "⏱️ Hora de retorno: <span class='alert-ok'>"+retornoFormatado+"</span>";

      // Atualiza resumo
      document.getElementById("resumoSaidaAlmoco").textContent = horaSaida;
      document.getElementById("resumoRetornoAlmoco").textContent = retornoFormatado;
    });

    // --- Exportar somente a tabela resumo em PDF (com logo) ---
    async function baixarResumoPDF() {
      const tabela = document.getElementById("tabelaResumo");
      const canvas = await html2canvas(tabela, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 210;  // A4 largura em mm
      const marginLeft = 10;
      const usableWidth = pageWidth - marginLeft * 2;

      // Posição inicial
      let currentY = 10;

      // Adiciona logo (se carregada)
      const logoEl = document.getElementById("logoPdf");
      if (logoEl && logoEl.complete) {
        // Largura e altura da logo (ajuste conforme sua imagem)
        const logoWidth = 60;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        pdf.addImage(logoEl, "PNG", logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 8; // espaço após a logo
      } else {
        // Se logo não estiver carregada, mantém um topo menor
        currentY += 5;
      }

      // Adiciona a tabela
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = usableWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", marginLeft, currentY, imgWidth, imgHeight);

      pdf.save("resumo-ponto.pdf");
    }
