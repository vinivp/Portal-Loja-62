    const intervaloHoras = document.getElementById("intervaloHoras");
    const intervaloMinutos = document.getElementById("intervaloMinutos");
    const totalIntervalo = document.getElementById("totalIntervalo");

    function atualizarTotalIntervalo() {
      const horas = parseInt(intervaloHoras.value) || 0;
      const minutos = parseInt(intervaloMinutos.value) || 0;
      const total = horas * 60 + minutos;
      totalIntervalo.value = total + " minutos";
    }

    intervaloHoras.addEventListener("input", atualizarTotalIntervalo);
    intervaloMinutos.addEventListener("input", atualizarTotalIntervalo);

    document.getElementById("calcForm").addEventListener("submit", function(e) {
      e.preventDefault();

      const horaChegada = document.getElementById("horaChegada").value;
      const intervaloTotal = parseInt(intervaloHoras.value) * 60 + parseInt(intervaloMinutos.value);

      if (!horaChegada || isNaN(intervaloTotal)) {
        alert("Preencha todos os campos corretamente!");
        return;
      }

      const [hora, minuto] = horaChegada.split(":").map(Number);
      const chegadaMinutos = hora * 60 + minuto;
      const jornada = 7 * 60 + 20;
      const saidaMinutos = chegadaMinutos + jornada + intervaloTotal;

      const saidaHora = Math.floor(saidaMinutos / 60) % 24;
      const saidaMinuto = saidaMinutos % 60;

      const saidaFormatada = 
        String(saidaHora).padStart(2, "0") + ":" + String(saidaMinuto).padStart(2, "0");

      document.getElementById("resultado").textContent = "⏰ Hora de saída: " + saidaFormatada;
    });

    atualizarTotalIntervalo(); // inicializa
    