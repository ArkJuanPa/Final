import Home from "./HomePage.js";
import delegate from "../services/delegate.js";

const NamePage = () => {
  const container = document.createElement("div");

  const input = document.createElement("input");
  input.placeholder = "Escribe tu nombre";
  input.style.marginRight = "10px";

  const button = document.createElement("button");
  button.textContent = "Entrar";

  button.onclick = async () => {
    const name = input.value.trim();

    if (name.length === 0) {
      alert("Debes escribir un nombre");
      return;
    }

    await delegate.init(name);    // <-- inicializa conexión con nombre

    document.getElementById("app").innerHTML = "";
    document.getElementById("app").appendChild(Home());
  };

  container.appendChild(input);
  container.appendChild(button);

  return container;
};

export default NamePage;
