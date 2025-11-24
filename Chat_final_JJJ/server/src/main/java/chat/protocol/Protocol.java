package chat.protocol;

import chat.model.*;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.lang.reflect.Type;
import java.time.LocalDateTime;

public class Protocol {
    private static final Gson gson = new GsonBuilder()
            .registerTypeAdapter(LocalDateTime.class, new LocalDateTimeAdapter())
            .create();

    public enum Command {
        // Autenticación
        LOGIN, REGISTER, LOGOUT,

        // Mensajes
        SEND_MESSAGE, RECEIVE_MESSAGE, GET_HISTORY,

        VOICE_NOTE_DATA,

        // Grupos
        CREATE_GROUP, ADD_TO_GROUP, SEND_GROUP_MESSAGE, GET_GROUP_MESSAGES, GET_USER_GROUPS,

        // Llamadas
        CALL_REQUEST, CALL_ACCEPT, CALL_REJECT, CALL_END,

        // Usuarios
        GET_USERS, GET_USER_STATUS, UPDATE_STATUS,

        // Respuestas
        SUCCESS, ERROR, NOTIFICATION
    }

    public static class Packet {
        private Command command;
        private String data;
        private String error;

        public Packet(Command command, String data) {
            this.command = command;
            this.data = data;
        }

        public Packet(Command command) {
            this.command = command;
        }

        public Command getCommand() {
            return command;
        }

        public String getData() {
            return data;
        }

        public void setData(String data) {
            this.data = data;
        }

        public String getError() {
            return error;
        }

        public void setError(String error) {
            this.error = error;
        }
    }

    public static String serialize(Packet packet) {
        return gson.toJson(packet);
    }

    public static Packet deserialize(String json) {
        return gson.fromJson(json, Packet.class);
    }

    public static <T> String toJson(T object) {
        return gson.toJson(object);
    }

    public static <T> T fromJson(String json, Class<T> clazz) {
        return gson.fromJson(json, clazz);
    }

    public static <T> T fromJson(String json, Type type) {
        return gson.fromJson(json, type);
    }
}
