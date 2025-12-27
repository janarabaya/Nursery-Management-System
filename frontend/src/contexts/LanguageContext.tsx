import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Settings
    'settings.title': 'Account & System Settings',
    'settings.subtitle': 'Manage your account, nursery, and system preferences',
    'settings.password': 'Change Password',
    'settings.profile': 'Manager Profile',
    'settings.permissions': 'User Permissions',
    'settings.nursery': 'Nursery Settings',
    'settings.system': 'System Settings',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.save': 'Save System Settings',
    
    // User Permissions
    'permissions.title': 'User Permissions Management',
    'permissions.selectUser': 'Select User',
    'permissions.assignRole': 'Assign Role',
    'permissions.userPermissions': 'User Permissions',
    'permissions.description': 'Select the actions this user is allowed to perform:',
    'permissions.updateRole': 'Update User Role',
    'permissions.savePermissions': 'Save Permissions',
    
    // Manager Dashboard
    'dashboard.title': 'Manager Dashboard',
    'dashboard.welcome': 'Welcome back',
    'dashboard.orderManagement': 'Order Management',
    'dashboard.plantManagement': 'Plant Management',
    'dashboard.employeeManagement': 'Employee Management',
    'dashboard.inventoryManagement': 'Inventory Management',
    'dashboard.reports': 'Reports',
    'dashboard.customerFeedback': 'Customer Feedback',
    'dashboard.settings': 'Settings',
    'dashboard.logout': 'Logout',
    'dashboard.back': 'Back',
    
    // Password
    'password.current': 'Current Password',
    'password.new': 'New Password',
    'password.confirm': 'Confirm New Password',
    'password.change': 'Change Password',
    'password.placeholder.current': 'Enter current password',
    'password.placeholder.new': 'Enter new password (min 8 characters)',
    'password.placeholder.confirm': 'Confirm new password',
    
    // Profile
    'profile.title': 'Manager Profile',
    'profile.fullName': 'Full Name',
    'profile.email': 'Email',
    'profile.phone': 'Phone Number',
    'profile.save': 'Save Profile',
    'profile.placeholder.name': 'Enter your full name',
    'profile.placeholder.email': 'Enter your email',
    'profile.placeholder.phone': 'Enter your phone number',
    
    // Nursery Settings
    'nursery.title': 'Nursery Settings',
    'nursery.name': 'Nursery Name',
    'nursery.location': 'Location',
    'nursery.workingHoursStart': 'Working Hours Start',
    'nursery.workingHoursEnd': 'Working Hours End',
    'nursery.workingDays': 'Working Days',
    'nursery.save': 'Save Nursery Settings',
    
    // System Settings
    'system.title': 'System Settings',
    'system.emailNotifications': 'Email Notifications',
    'system.lowStockAlerts': 'Low Stock Alerts',
    'system.orderNotifications': 'Order Notifications',
    'system.reportFrequency': 'Report Frequency',
    'system.save': 'Save System Settings',
    
    // User Types
    'userType.employee': 'Employee',
    'userType.agriculturalEngineer': 'Agricultural Engineer',
    'userType.customer': 'Customer',
    'userType.deliveryCompany': 'Delivery Company',
    'userType.supplier': 'Supplier',
    
    // Roles
    'role.customer': 'Customer',
    'role.employee': 'Employee',
    'role.nursery_worker': 'Nursery Worker',
    'role.delivery': 'Delivery Employee',
    'role.accountant': 'Accountant',
    'role.agricultural_engineer': 'Agricultural Engineer',
    'role.manager': 'Manager',
    
    // Days
    'day.monday': 'Monday',
    'day.tuesday': 'Tuesday',
    'day.wednesday': 'Wednesday',
    'day.thursday': 'Thursday',
    'day.friday': 'Friday',
    'day.saturday': 'Saturday',
    'day.sunday': 'Sunday',
  },
  ar: {
    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.submit': 'إرسال',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    
    // Settings
    'settings.title': 'إعدادات الحساب والنظام',
    'settings.subtitle': 'إدارة حسابك وإعدادات المشتل والتفضيلات',
    'settings.password': 'تغيير كلمة المرور',
    'settings.profile': 'ملف المدير',
    'settings.permissions': 'صلاحيات المستخدمين',
    'settings.nursery': 'إعدادات المشتل',
    'settings.system': 'إعدادات النظام',
    'settings.theme': 'المظهر',
    'settings.language': 'اللغة',
    'settings.save': 'حفظ إعدادات النظام',
    
    // User Permissions
    'permissions.title': 'إدارة صلاحيات المستخدمين',
    'permissions.selectUser': 'اختر مستخدم',
    'permissions.assignRole': 'تعيين دور',
    'permissions.userPermissions': 'صلاحيات المستخدم',
    'permissions.description': 'اختر الإجراءات المسموح لهذا المستخدم بتنفيذها:',
    'permissions.updateRole': 'تحديث دور المستخدم',
    'permissions.savePermissions': 'حفظ الصلاحيات',
    
    // Manager Dashboard
    'dashboard.title': 'لوحة تحكم المدير',
    'dashboard.welcome': 'مرحباً بعودتك',
    'dashboard.orderManagement': 'إدارة الطلبات',
    'dashboard.plantManagement': 'إدارة النباتات',
    'dashboard.employeeManagement': 'إدارة الموظفين',
    'dashboard.inventoryManagement': 'إدارة المخزون',
    'dashboard.reports': 'التقارير',
    'dashboard.customerFeedback': 'ملاحظات العملاء',
    'dashboard.settings': 'الإعدادات',
    'dashboard.logout': 'تسجيل الخروج',
    'dashboard.back': 'رجوع',
    
    // Password
    'password.current': 'كلمة المرور الحالية',
    'password.new': 'كلمة المرور الجديدة',
    'password.confirm': 'تأكيد كلمة المرور الجديدة',
    'password.change': 'تغيير كلمة المرور',
    'password.placeholder.current': 'أدخل كلمة المرور الحالية',
    'password.placeholder.new': 'أدخل كلمة المرور الجديدة (8 أحرف على الأقل)',
    'password.placeholder.confirm': 'أكد كلمة المرور الجديدة',
    
    // Profile
    'profile.title': 'ملف المدير',
    'profile.fullName': 'الاسم الكامل',
    'profile.email': 'البريد الإلكتروني',
    'profile.phone': 'رقم الهاتف',
    'profile.save': 'حفظ الملف',
    'profile.placeholder.name': 'أدخل اسمك الكامل',
    'profile.placeholder.email': 'أدخل بريدك الإلكتروني',
    'profile.placeholder.phone': 'أدخل رقم هاتفك',
    
    // Nursery Settings
    'nursery.title': 'إعدادات المشتل',
    'nursery.name': 'اسم المشتل',
    'nursery.location': 'الموقع',
    'nursery.workingHoursStart': 'بداية ساعات العمل',
    'nursery.workingHoursEnd': 'نهاية ساعات العمل',
    'nursery.workingDays': 'أيام العمل',
    'nursery.save': 'حفظ إعدادات المشتل',
    
    // System Settings
    'system.title': 'إعدادات النظام',
    'system.emailNotifications': 'إشعارات البريد الإلكتروني',
    'system.lowStockAlerts': 'تنبيهات المخزون المنخفض',
    'system.orderNotifications': 'إشعارات الطلبات',
    'system.reportFrequency': 'تكرار التقارير',
    'system.save': 'حفظ إعدادات النظام',
    
    // User Types
    'userType.employee': 'موظف',
    'userType.agriculturalEngineer': 'مهندس زراعي',
    'userType.customer': 'زبون',
    'userType.deliveryCompany': 'شركة توصيل',
    'userType.supplier': 'مزود',
    
    // Roles
    'role.customer': 'زبون',
    'role.employee': 'موظف',
    'role.nursery_worker': 'عامل مشتل',
    'role.delivery': 'موظف توصيل',
    'role.accountant': 'محاسب',
    'role.agricultural_engineer': 'مهندس زراعي',
    'role.manager': 'مدير',
    
    // Days
    'day.monday': 'الاثنين',
    'day.tuesday': 'الثلاثاء',
    'day.wednesday': 'الأربعاء',
    'day.thursday': 'الخميس',
    'day.friday': 'الجمعة',
    'day.saturday': 'السبت',
    'day.sunday': 'الأحد',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage || 'en';
  });

  const [isRTL, setIsRTL] = useState(language === 'ar');

  useEffect(() => {
    setIsRTL(language === 'ar');
    
    // Apply RTL/LTR to document
    if (language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
  }, [language]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

