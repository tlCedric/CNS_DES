package Java_MiniProject;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class EquipmentDAO {

    // 1. CREATE (INSERT)
    public void addLoan(EquipmentLoan loan) throws SQLException { // This method adds a new equipment loan record to the database
        String sql = "INSERT INTO equipment_loans "
            + "(Registration_No, Student_Name, Equipment_Name, Serial_Number, Status) "
            + "VALUES (?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, loan.getRegistration_No());
            stmt.setString(2, loan.getStudent_Name());
            stmt.setString(3, loan.getEquipment_Name());
            stmt.setString(4, loan.getSerial_Number());
            stmt.setString(5, loan.getStatus());
            stmt.executeUpdate();
        }
    }

    // 2. READ (SELECT)
    public List<EquipmentLoan> getAllLoans() throws SQLException { // This method retrieves all equipment loan records from the database
        List<EquipmentLoan> loans = new ArrayList<>();
        String sql = "SELECT Registration_No, Student_Name, Equipment_Name, Serial_Number, Status "
            + "FROM equipment_loans ORDER BY Registration_No";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

             while (rs.next()) {
                 EquipmentLoan loan = new EquipmentLoan(
                     rs.getString("Registration_No"),
                     rs.getString("Student_Name"),
                     rs.getString("Equipment_Name"),
                     rs.getString("Serial_Number"),
                     rs.getString("Status")
                 );
                 loans.add(loan);
             }
        }
        return loans;
    }

    // 3. UPDATE Operation
    public void updateLoan(String oldRegistrationNo, EquipmentLoan loan) throws SQLException { // This method updates an existing equipment loan record in the database
        String sql = "UPDATE equipment_loans SET Registration_No = ?, Student_Name = ?, "
                + "Equipment_Name = ?, Serial_Number = ?, Status = ? WHERE Registration_No = ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, loan.getRegistration_No());
            stmt.setString(2, loan.getStudent_Name());
            stmt.setString(3, loan.getEquipment_Name());
            stmt.setString(4, loan.getSerial_Number());
            stmt.setString(5, loan.getStatus());
            stmt.setString(6, oldRegistrationNo);
            stmt.executeUpdate();
        }
    }

    // 4. DELETE Operation
    public void deleteLoan(String registrationNo) throws SQLException { // This method deletes an equipment loan record from the database based on the registration number
        String sql = "DELETE FROM equipment_loans WHERE Registration_No = ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, registrationNo);
            stmt.executeUpdate();
        }
    }
}
