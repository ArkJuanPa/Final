package server;

import com.zeroc.Ice.Util;
import com.zeroc.Ice.Communicator;
import com.zeroc.Ice.ObjectAdapter;
import Demo.*;

public class AudioServer {

    public static void main(String[] args) {
        // Arrancamos Ice
        try (Communicator communicator = Util.initialize(args)) {

            // Adapter que atiende WebSocket en el puerto 9099 (ws)
            ObjectAdapter adapter =
                communicator.createObjectAdapterWithEndpoints("AudioAdapter",
                        "ws -h localhost -p 9099");

            SubjectImpl impl = new SubjectImpl();

            // registrar el servant con identity "AudioService"
            adapter.add(impl, Util.stringToIdentity("AudioService"));
            adapter.activate();

            System.out.println("[SERVER] Ice WebSocket server ready on ws://localhost:9099");

            communicator.waitForShutdown();

            // al cerrar
            impl.shutdown();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
