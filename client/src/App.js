import "./App.css";
import socketIO from "socket.io-client";
const socket = socketIO.connect("http://localhost:8000");

function App() {
  return <div className="App">cool</div>;
}

export default App;
