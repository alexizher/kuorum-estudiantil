// Selector de tema: claro, oscuro o sistema. Se guarda en localStorage.
// Se carga en el <head> para aplicar el tema antes de pintar.
(function () {
  var CLAVE = "kuorum-maquetas-tema";
  var raiz = document.documentElement;

  function leer() {
    try { return localStorage.getItem(CLAVE) || "sistema"; } catch (e) { return "sistema"; }
  }
  function guardar(valor) {
    try { localStorage.setItem(CLAVE, valor); } catch (e) { /* sin almacenamiento: solo esta visita */ }
  }
  function aplicar(valor) {
    if (valor === "claro" || valor === "oscuro") raiz.setAttribute("data-tema", valor);
    else raiz.removeAttribute("data-tema");
  }

  var actual = leer();
  aplicar(actual);

  function montar() {
    var destinos = document.querySelectorAll("[data-tema-control]");
    if (!destinos.length) {
      var suelto = document.createElement("div");
      suelto.setAttribute("data-tema-control", "");
      document.body.appendChild(suelto);
      destinos = [suelto];
    }
    var opciones = [["claro", "Claro"], ["oscuro", "Oscuro"], ["sistema", "Sistema"]];
    Array.prototype.forEach.call(destinos, function (destino) {
      destino.classList.add("tema");
      destino.innerHTML = "";
      var etiqueta = document.createElement("span");
      etiqueta.textContent = "Tema";
      etiqueta.id = "tema-etiqueta-" + Math.random().toString(36).slice(2, 7);
      var grupo = document.createElement("div");
      grupo.className = "tema__grupo";
      grupo.setAttribute("role", "group");
      grupo.setAttribute("aria-labelledby", etiqueta.id);
      opciones.forEach(function (op) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = op[1];
        b.dataset.valor = op[0];
        b.setAttribute("aria-pressed", String(op[0] === actual));
        b.addEventListener("click", function () {
          actual = op[0];
          aplicar(actual);
          guardar(actual);
          document.querySelectorAll(".tema button").forEach(function (otro) {
            otro.setAttribute("aria-pressed", String(otro.dataset.valor === actual));
          });
        });
        grupo.appendChild(b);
      });
      destino.appendChild(etiqueta);
      destino.appendChild(grupo);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})();
