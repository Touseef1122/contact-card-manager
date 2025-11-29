import React, { useState, useEffect } from "react";
import { Users, Upload, UserPlus, Camera, Download, X, Search, Mail, Phone, Building2, MapPin, Edit2, Trash2, Save, Sparkles, Zap, Brain, CheckCircle } from "lucide-react";
import Tesseract from "tesseract.js";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import "./index.css";

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [notifications, setNotifications] = useState([]);

  /* Load saved contacts */
  useEffect(() => {
    const saved = localStorage.getItem("contacts");
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("contacts", JSON.stringify(contacts));
  }, [contacts]);

  /* Notification System */
  const addNotification = (message, type = "success") => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  /* ------------ ENHANCED OCR FUNCTION ------------- */
  const handleImageUpload = async (e) => {
    const files = [...e.target.files];
    if (files.length === 0) return;

    setIsUploading(true);
    setOcrProgress(0);

    let processedCount = 0;

    for (let file of files) {
      try {
        const result = await Tesseract.recognize(file, "eng", {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        });

        const text = result.data.text;
        console.log("OCR Text:", text);

        const contact = {
          id: Date.now() + Math.random(),
          name: extractName(text),
          phone: extractPhone(text),
          email: extractEmail(text),
          company: extractCompany(text),
          address: extractAddress(text),
          imageUrl: URL.createObjectURL(file),
          dateAdded: new Date().toISOString(),
          rawText: text
        };

        setContacts((prev) => [...prev, contact]);
        processedCount++;
        
        // Add success notification for each processed card
        addNotification(`✅ Contact "${contact.name}" extracted successfully!`, "success");

      } catch (err) {
        console.error("OCR Error:", err);
        // Fallback contact
        const fallbackContact = {
          id: Date.now() + Math.random(),
          name: "Unknown Contact",
          phone: "Not detected",
          email: "",
          company: "",
          address: "",
          imageUrl: URL.createObjectURL(file),
          dateAdded: new Date().toISOString()
        };
        setContacts(prev => [...prev, fallbackContact]);
        addNotification("⚠️ Some contacts required manual review", "warning");
      }
    }

    setIsUploading(false);
    setOcrProgress(0);
    e.target.value = "";

    // Final success message
    if (processedCount > 0) {
      addNotification(`🎉 Successfully processed ${processedCount} business card(s)!`, "success");
    }
  };

  /* --- ENHANCED Parsing Helpers --- */
  const extractName = (txt) => {
    const lines = txt.split('\n').filter(line => line.trim().length > 2);
    for (let line of lines) {
      if (!isEmail(line) && !isPhoneNumber(line) && line.length > 3 && line.length < 50) {
        const words = line.split(' ').filter(word => word.length > 0);
        if (words.length >= 1 && words.length <= 4) {
          return line.trim();
        }
      }
    }
    return "Unknown Contact";
  };

  const extractPhone = (txt) => {
    const phoneRegex = /(\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const matches = txt.match(phoneRegex);
    return matches ? matches[0] : "Not detected";
  };

  const extractEmail = (txt) => {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = txt.match(emailRegex);
    return matches ? matches[0] : "";
  };

  const extractCompany = (txt) => {
    const lines = txt.split('\n').filter(line => line.trim().length > 2);
    const companyIndicators = ['Inc', 'Corp', 'LLC', 'Ltd', 'Company', 'Co', 'Group'];
    
    for (let line of lines) {
      if (companyIndicators.some(indicator => line.toUpperCase().includes(indicator.toUpperCase()))) {
        return line.trim();
      }
    }
    
    // Return second line as fallback
    return lines.length > 1 ? lines[1] : "";
  };

  const extractAddress = (txt) => {
    const addressRegex = /\b\d{1,5}\s+[\w\s]+,?\s*(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi;
    const matches = txt.match(addressRegex);
    return matches ? matches[0] : "";
  };

  const isEmail = (text) => {
    return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text);
  };

  const isPhoneNumber = (text) => {
    return /(\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
  };

  /* Add Contact */
  const addManual = () => {
    if (!newContact.name || !newContact.phone) {
      addNotification("❌ Name & Phone are required fields", "error");
      return;
    }

    const contact = {
      ...newContact,
      id: Date.now(),
      dateAdded: new Date().toISOString()
    };

    setContacts([...contacts, contact]);
    setNewContact({ name: "", phone: "", email: "", company: "", address: "" });
    setShowAddForm(false);
    
    addNotification(`✅ Contact "${contact.name}" added successfully!`, "success");
  };

  /* Delete Contact */
  const deleteContact = (id) => {
    const contact = contacts.find(c => c.id === id);
    if (window.confirm(`Are you sure you want to delete ${contact.name}?`)) {
      setContacts(contacts.filter(c => c.id !== id));
      addNotification(`🗑️ Contact "${contact.name}" deleted`, "info");
    }
  };

  /* Edit Contact */
  const startEdit = (contact) => {
    setEditingId(contact.id);
    setEditForm({ ...contact });
  };

  const saveEdit = () => {
    if (!editForm.name || !editForm.phone) {
      addNotification("❌ Name & Phone are required fields", "error");
      return;
    }

    setContacts(contacts.map(c => c.id === editingId ? editForm : c));
    setEditingId(null);
    setEditForm({});
    
    addNotification(`✏️ Contact "${editForm.name}" updated successfully!`, "success");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  /* -------- FIXED PDF DOWNLOAD -------- */
  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("Contact List", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    // Prepare table data
    const tableData = contacts.map((c) => [
      c.name,
      c.phone,
      c.email || 'N/A',
      c.company || 'N/A',
      c.address || 'N/A',
    ]);

    // Use autoTable correctly
    autoTable(doc, {
      head: [["Name", "Phone", "Email", "Company", "Address"]],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });

    doc.save("contact-list.pdf");
    addNotification("📄 PDF exported successfully!", "success");
  };

  /* Filter contacts for search */
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery) ||
    (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Notification Container */}
      <div className="notification-container">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`notification ${notification.type}`}
          >
            <div className="notification-content">
              <CheckCircle size={18} />
              <span>{notification.message}</span>
            </div>
            <div className="notification-progress"></div>
          </div>
        ))}
      </div>

      {/* ENHANCED NAVBAR */}
      <div className="navbar">
        <div className="nav-brand">
          <div className="ai-icon">
            <Brain size={24} />
            <div className="pulse-dot"></div>
          </div>
          <h1>ContactAI Manager</h1>
        </div>

        <button className="nav-button" onClick={() => setModalOpen(true)}>
          <Users size={18} />
          View Contacts ({contacts.length})
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="page-container">
        {/* AI Header */}
        <div className="ai-header">
          <div className="ai-title">
            <Sparkles className="sparkle-icon" size={32} />
            <h1>AI-Powered Contact Extraction</h1>
          </div>
          <p>Upload business cards and let our AI extract contact information automatically</p>
        </div>

        <div className="content-grid">
          {/* Upload Section */}
          <div className="card upload-card">
            <div className="card-header">
              <Camera size={24} />
              <h2>Upload Business Cards</h2>
              <div className="ai-badge">AI Powered</div>
            </div>
            
            <label className="upload-area">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="file-input" 
                disabled={isUploading}
              />
              <div className="upload-content">
                <div className="upload-icon">
                  <Upload size={48} />
                  {isUploading && <div className="scanning-animation"></div>}
                </div>
                <h3>{isUploading ? "AI is scanning..." : "Drop or click to upload"}</h3>
                <p>Supports JPG, PNG • Multiple cards allowed</p>
                
                {isUploading && (
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${ocrProgress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{ocrProgress}% processed</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Add Contact Section */}
          <div className="card add-contact-card">
            <div className="card-header">
              <UserPlus size={24} />
              <h2>Add Contact Manually</h2>
            </div>

            {!showAddForm ? (
              <div 
                className="add-contact-btn" 
                onClick={() => setShowAddForm(true)}
              >
                <div className="add-icon">
                  <div className="plus-animation">+</div>
                </div>
                <div className="add-text">
                  <h3>Add New Contact</h3>
                  <p>Create contact manually</p>
                </div>
              </div>
            ) : (
              <div className="contact-form">
                <div className="form-group">
                  <input 
                    placeholder="Full Name *" 
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <input 
                    placeholder="Phone Number *" 
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <input 
                    placeholder="Email Address" 
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <input 
                    placeholder="Company" 
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} 
                  />
                </div>

                <div className="form-actions">
                  <button className="save-btn" onClick={addManual}>
                    <Save size={16} />
                    Save Contact
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={() => setShowAddForm(false)}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ENHANCED CONTACT LIST MODAL */}
      {modalOpen && (
        <div className="modal-bg">
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">
                <Users size={24} />
                <h2>Contact Directory</h2>
                <span className="contact-count">{filteredContacts.length} contacts</span>
              </div>
              
              <div className="modal-actions">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="download-btn" onClick={downloadPDF}>
                  <Download size={16} />
                  Export PDF
                </button>
                <button className="close-btn" onClick={() => setModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="contacts-grid">
              {filteredContacts.length === 0 ? (
                <div className="empty-state">
                  <Users size={64} />
                  <h3>No contacts found</h3>
                  <p>{contacts.length === 0 ? "Start by uploading business cards or adding contacts" : "Try adjusting your search terms"}</p>
                </div>
              ) : (
                filteredContacts.map((contact, index) => (
                  <div 
                    key={contact.id} 
                    className="contact-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {contact.imageUrl && (
                      <div className="contact-image">
                        <img src={contact.imageUrl} alt={contact.name} />
                        <div className="ai-scan-badge">
                          <Zap size={12} />
                          AI Scanned
                        </div>
                        <div className="card-shine"></div>
                      </div>
                    )}
                    
                    <div className="contact-content">
                      {editingId === contact.id ? (
                        <div className="edit-form">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            placeholder="Name"
                          />
                          <input
                            value={editForm.phone}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                            placeholder="Phone"
                          />
                          <input
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            placeholder="Email"
                          />
                          <input
                            value={editForm.company || ''}
                            onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                            placeholder="Company"
                          />
                          <div className="edit-actions">
                            <button className="save-btn" onClick={saveEdit}>
                              <Save size={14} />
                              Save
                            </button>
                            <button className="cancel-btn" onClick={cancelEdit}>
                              <X size={14} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="contact-header">
                            <h3 className="contact-name">{contact.name}</h3>
                            <div className="contact-actions">
                              <button 
                                className="action-btn edit-btn"
                                onClick={() => startEdit(contact)}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className="action-btn delete-btn"
                                onClick={() => deleteContact(contact.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="contact-details">
                            <div className="contact-field">
                              <Phone size={16} />
                              <span>{contact.phone}</span>
                            </div>
                            {contact.email && (
                              <div className="contact-field">
                                <Mail size={16} />
                                <span>{contact.email}</span>
                              </div>
                            )}
                            {contact.company && (
                              <div className="contact-field">
                                <Building2 size={16} />
                                <span>{contact.company}</span>
                              </div>
                            )}
                            {contact.address && (
                              <div className="contact-field">
                                <MapPin size={16} />
                                <span>{contact.address}</span>
                              </div>
                            )}
                          </div>

                          <div className="contact-footer">
                            <span className="contact-date">
                              Added {new Date(contact.dateAdded).toLocaleDateString()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}