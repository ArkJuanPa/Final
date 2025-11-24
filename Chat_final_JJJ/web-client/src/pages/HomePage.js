import Player from "../components/Player.js";

const Home = () => {
    const container = document.createElement("div")


    const player = Player()

    container.appendChild(player)

    return container;
}

export default Home;