# Plant Nursery Project

مشروع مشتل النباتات - جميع الملفات في مكان واحد

## هيكل المشروع

```
plant-nursery-project/
├── frontend/          # React Frontend (من plant-frontend)
├── backend/           # Node.js Backend (من plant-backend)
└── README.md          # هذا الملف
```

## الخطوات المتبقية

1. **إغلاق جميع البرامج التي تستخدم plant-frontend:**
   - إغلاق VS Code أو أي IDE
   - إيقاف سيرفر التطوير إذا كان يعمل
   - إغلاق أي terminal windows

2. **نقل plant-frontend:**
   ```powershell
   cd "C:\Users\ayedr\OneDrive\Desktop\The Work\edentist"
   Move-Item -Path "plant-frontend" -Destination "plant-nursery-project\frontend" -Force
   ```

3. **تحديث المسارات في الكود:**
   - تحديث أي مراجع لـ `plant-frontend` إلى `plant-nursery-project/frontend`
   - تحديث أي مراجع لـ `plant-backend` إلى `plant-nursery-project/backend`

## تشغيل المشروع

### Backend
```bash
cd plant-nursery-project/backend
npm install
npm run dev
```

### Frontend
```bash
cd plant-nursery-project/frontend
npm install
npm start
```

## قاعدة البيانات

مسار قاعدة البيانات Access:
```
C:\Users\ayedr\OneDrive\Desktop\jana\Last Semester Courses\Graguation Project\NurseryDB1.accdb
```

يتم تكوينه في: `backend/src/config/accessDb.ts`

