import { useState } from 'react';
import './ContactForm.css';

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  plantInquiry: string;
}

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    message: '',
    plantInquiry: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // TODO: Replace with actual API endpoint
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('message', formData.message);
      formDataToSend.append('plantInquiry', formData.plantInquiry);
      if (selectedImage) {
        formDataToSend.append('plantImage', selectedImage);
      }

      // Simulate API call - replace with actual endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitMessage({ type: 'success', text: 'Your message has been sent successfully! We will get back to you soon.' });
      setFormData({ name: '', email: '', message: '', plantInquiry: '' });
      setSelectedImage(null);
    } catch (error) {
      setSubmitMessage({ type: 'error', text: 'An error occurred while sending. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="home-contact" id="contact">
      <div className="home-contact-content">
        <h2>Contact Us</h2>
        <p className="home-contact-subtitle">
          Have any questions or suggestions? We'd love to hear from you! Fill out the form below and we'll get back to you soon.
        </p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              placeholder="Your message..."
              rows={5}
              value={formData.message}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="plantImage">Upload Plant Image (Optional)</label>
            <input
              type="file"
              id="plantImage"
              name="plantImage"
              accept="image/*"
              onChange={handleImageChange}
            />
            {selectedImage && (
              <p className="file-name">Selected: {selectedImage.name}</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="plantInquiry">Plant Inquiry (Optional)</label>
            <textarea
              id="plantInquiry"
              name="plantInquiry"
              placeholder="Write your plant inquiry here..."
              rows={3}
              value={formData.plantInquiry}
              onChange={handleInputChange}
            />
          </div>
          {submitMessage && (
            <div className={`submit-message ${submitMessage.type}`}>
              {submitMessage.text}
            </div>
          )}
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  );
}










