package Java_MiniProject;

public class DatabaseConnection { // Database connection details
    private static final String url = "jdbc:mysql://localhost:3306/campus_lab_db"; // This is the database URL
    private static final String user = "root"; // This is the database username
    private static final String password = "amadeus"; // This is the database password

    public static java.sql.Connection getConnection() throws java.sql.SQLException {
        try { // Load the MySQL JDBC driver
            Class.forName("com.mysql.cj.jdbc.Driver");
            return java.sql.DriverManager.getConnection(url, user, password); // Establish and return the database connection
        } catch (ClassNotFoundException e) { // Handle the case where the JDBC driver is not found
            throw new java.sql.SQLException("MySQL JDBC Driver not found.", e);
        }
    }
}
