package Java_MiniProject;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.event.*;
import java.sql.SQLException;
import java.util.List;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;

public class LabEquipmentGUI extends JFrame { // This class represents the GUI for the lab equipment management system
    private JTextField txtRegNo, txtStudentName, txtEquipmentName, txtSerialNo, txtStatus;
    private JTable table;
    private DefaultTableModel tableModel;
    private EquipmentDAO dao = new EquipmentDAO();
    private String selectedRegistrationNo = null;

    public LabEquipmentGUI() { // Constructor to initialize the GUI
        setTitle("Campus Lab Equipment Management System");
        setSize(680, 500);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);

        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(12, 12, 12, 12));
        JPanel formPanel = new JPanel(new GridLayout(5, 2, 8, 8));
        formPanel.setBorder(BorderFactory.createTitledBorder("Loan details"));

        txtRegNo = new JTextField(15);
        txtStudentName = new JTextField(15);
        txtEquipmentName = new JTextField(15);
        txtSerialNo = new JTextField(15);
        txtStatus = new JTextField(15);

        formPanel.add(new JLabel("Student registration number"));
        formPanel.add(txtRegNo);
        formPanel.add(new JLabel("Student name"));
        formPanel.add(txtStudentName);
        formPanel.add(new JLabel("Equipment name"));
        formPanel.add(txtEquipmentName);
        formPanel.add(new JLabel("Serial number"));
        formPanel.add(txtSerialNo);
        formPanel.add(new JLabel("Status (Borrowed/Returned)"));
        formPanel.add(txtStatus);

        JButton btnAdd = new JButton("Add");
        JButton btnUpdate = new JButton("Update");
        JButton btnDelete = new JButton("Delete");
        JButton btnClear = new JButton("Clear");

        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        buttonPanel.add(btnAdd);
        buttonPanel.add(btnUpdate);
        buttonPanel.add(btnDelete);
        buttonPanel.add(btnClear);

        String[] columns = {"Reg No", "Student Name", "Equipment", "Serial No", "Status"};
        tableModel = new DefaultTableModel(columns, 0);
        table = new JTable(tableModel);
        table.setRowHeight(24);
        table.setFillsViewportHeight(true);
        JScrollPane scrollPane = new JScrollPane(table);
        scrollPane.setBorder(BorderFactory.createTitledBorder("Equipment loans"));
        scrollPane.setPreferredSize(new Dimension(620, 250));

        JPanel topPanel = new JPanel(new BorderLayout(8, 8));
        topPanel.add(formPanel, BorderLayout.CENTER);
        topPanel.add(buttonPanel, BorderLayout.SOUTH);
        panel.add(topPanel, BorderLayout.NORTH);
        panel.add(scrollPane, BorderLayout.CENTER);
        setContentPane(panel);

        // 4. Fill text boxes when a table row is clicked
        table.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                int row = table.getSelectedRow();
                if (row >= 0) {
                    selectedRegistrationNo = tableModel.getValueAt(row, 0).toString();
                    txtRegNo.setText(tableModel.getValueAt(row, 0).toString());
                    txtStudentName.setText(tableModel.getValueAt(row, 1).toString());
                    txtEquipmentName.setText(tableModel.getValueAt(row, 2).toString());
                    txtSerialNo.setText(tableModel.getValueAt(row, 3).toString());
                    txtStatus.setText(tableModel.getValueAt(row, 4).toString());
                }
            }
        });

        // 5. Button Click Events
        btnAdd.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                addRecord();
            }
        });

        btnUpdate.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                updateRecord();
            }
        });

        btnDelete.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                deleteRecord();
            }
        });

        btnClear.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                clearFields();
            }
        });

        // Load existing database records when app opens
        loadRecords();
    }

    // Input Validation (Requirement 5)
    private boolean validateInput() {
        if (txtRegNo.getText().trim().isEmpty() ||
            txtStudentName.getText().trim().isEmpty() ||
            txtEquipmentName.getText().trim().isEmpty() ||
            txtSerialNo.getText().trim().isEmpty() ||
            txtStatus.getText().trim().isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please fill in all fields!");
            return false;
        }
        if (txtRegNo.getText().trim().length() > 20) {
            JOptionPane.showMessageDialog(this, "Student registration number must be 20 characters or fewer.");
            return false;
        }
        String status = txtStatus.getText().trim();
        if (!status.equalsIgnoreCase("Borrowed") && !status.equalsIgnoreCase("Returned")) {
            JOptionPane.showMessageDialog(this, "Status must be Borrowed or Returned.");
            return false;
        }
        return true;
    }

    private void addRecord() {
        if (!validateInput()) return;
        try {
            EquipmentLoan loan = new EquipmentLoan(
                txtRegNo.getText().trim(),
                txtStudentName.getText().trim(),
                txtEquipmentName.getText().trim(),
                txtSerialNo.getText().trim(),
                txtStatus.getText().trim()
            );
            dao.addLoan(loan);
            JOptionPane.showMessageDialog(this, "Record Added!");
            clearFields();
            loadRecords();
        } catch (SQLException ex) {
            JOptionPane.showMessageDialog(this, "Database Error: " + ex.getMessage());
        }
    }

    private void updateRecord() {
        if (selectedRegistrationNo == null) {
            JOptionPane.showMessageDialog(this, "Click a row in the table first!");
            return;
        }
        if (!validateInput()) return;
        try {
            EquipmentLoan loan = new EquipmentLoan(
                txtRegNo.getText().trim(),
                txtStudentName.getText().trim(),
                txtEquipmentName.getText().trim(),
                txtSerialNo.getText().trim(),
                txtStatus.getText().trim()
            );
            dao.updateLoan(selectedRegistrationNo, loan);
            JOptionPane.showMessageDialog(this, "Record Updated!");
            clearFields();
            loadRecords();
        } catch (SQLException ex) {
            JOptionPane.showMessageDialog(this, "Database Error: " + ex.getMessage());
        }
    }

    private void deleteRecord() {
        if (selectedRegistrationNo == null) {
            JOptionPane.showMessageDialog(this, "Click a row in the table first!");
            return;
        }
        int confirm = JOptionPane.showConfirmDialog(this, "Delete this record?", "Confirm", JOptionPane.YES_NO_OPTION);
        if (confirm == JOptionPane.YES_OPTION) {
            try {
                dao.deleteLoan(selectedRegistrationNo);
                JOptionPane.showMessageDialog(this, "Record Deleted!");
                clearFields();
                loadRecords();
            } catch (SQLException ex) {
                JOptionPane.showMessageDialog(this, "Database Error: " + ex.getMessage());
            }
        }
    }

    private void loadRecords() {
        try {
            tableModel.setRowCount(0); // Clear old rows
            List<EquipmentLoan> list = dao.getAllLoans();
            for (EquipmentLoan loan : list) {
                tableModel.addRow(new Object[]{
                    loan.getRegistration_No(),
                    loan.getStudent_Name(),
                    loan.getEquipment_Name(),
                    loan.getSerial_Number(),
                    loan.getStatus()
                });
            }
        } catch (SQLException ex) {
            JOptionPane.showMessageDialog(this, "Database Error: " + ex.getMessage());
        }
    }

    private void clearFields() {
        selectedRegistrationNo = null;
        txtRegNo.setText("");
        txtStudentName.setText("");
        txtEquipmentName.setText("");
        txtSerialNo.setText("");
        txtStatus.setText("");
        table.clearSelection();
    }
}
