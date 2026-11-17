package Java_MiniProject;
public class EquipmentLoan { // This class represents an equipment loan record
    private String Registration_No;
    private String Student_Name;
    private String Equipment_Name;
    private String Serial_Number;
    private String Status;

    public EquipmentLoan(String Registration_No, String Student_Name, String Equipment_Name, String Serial_Number, String Status) { // Constructor to initialize an equipment loan record
        this.Registration_No = Registration_No;
        this.Student_Name = Student_Name;
        this.Equipment_Name = Equipment_Name;
        this.Serial_Number = Serial_Number;
        this.Status = Status;
    }
    public String getRegistration_No() { // Getter for Registration_No
        return Registration_No;
    }
    public void setRegistration_No(String Registration_No) { // Setter for Registration_No
        this.Registration_No = Registration_No;
    }
    public String getStudent_Name() { // Getter for Student_Name
        return Student_Name;
    }
    public void setStudent_Name(String Student_Name) { // Setter for Student_Name
        this.Student_Name = Student_Name;
    }
    public String getEquipment_Name() { // Getter for Equipment_Name
        return Equipment_Name;
    }
    public void setEquipment_Name(String Equipment_Name) {// Setter for Equipment_Name
        this.Equipment_Name = Equipment_Name;
    }
    public String getSerial_Number() { // Getter for Serial_Number
        return Serial_Number;
    }
    public void setSerial_Number(String Serial_Number) { // Setter for Serial_Number
        this.Serial_Number = Serial_Number;
    }
    public String getStatus() { // Getter for Status
        return Status;
    }
    public void setStatus(String Status) { // Setter for Status
        this.Status = Status;
    }
}
