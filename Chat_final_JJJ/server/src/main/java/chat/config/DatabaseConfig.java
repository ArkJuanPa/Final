package chat.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.stream.Collectors;

public class DatabaseConfig {
    private static DatabaseConfig instance;
    private final HikariDataSource dataSource;

    private DatabaseConfig() {
        HikariConfig config = new HikariConfig();

        // Datos de conexión a la base PostgreSQL
        config.setJdbcUrl("jdbc:postgresql://localhost:5432/chatdb");
        config.setUsername("postgres");
        config.setPassword("59121213");
        config.setDriverClassName("org.postgresql.Driver");

        // Configuración del pool de conexiones (HikariCP)
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000); 
        config.setIdleTimeout(600000);      
        config.setMaxLifetime(1800000);     

        this.dataSource = new HikariDataSource(config);

        // Inicializar esquema
        initializeSchema();
    }

    public static synchronized DatabaseConfig getInstance() {
        if (instance == null) {
            instance = new DatabaseConfig();
        }
        return instance;
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }

    private void initializeSchema() {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {

            var schemaStream = getClass().getClassLoader().getResourceAsStream("schema.sql");
            if (schemaStream == null) {
                System.out.println("No se encontro schema.sql en resources, se omite inicializacion.");
                return;
            }

            String schema = new BufferedReader(
                    new InputStreamReader(schemaStream)
            ).lines().collect(Collectors.joining("\n"));

            stmt.execute(schema);
            System.out.println("Esquema de base de datos inicializado correctamente.");

        } catch (Exception e) {
            System.err.println("Error al inicializar el esquema: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void close() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
        }
    }
}
