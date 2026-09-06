# ออก release APK

Android อย่างเดียว แจกไฟล์ตรง ยังไม่ขึ้น Play Store

## กุญแจเซ็นแอป — อ่านก่อน

```
~/.keystores/slipsummary-release.jks     ตัวกุญแจ
~/.keystores/slipsummary-release.env     รหัสผ่าน + alias
```

**ทั้งสองไฟล์อยู่นอก repo โดยตั้งใจ** และ**ไม่มีที่สำรองอยู่ที่อื่นเลย**

ถ้าไฟล์นี้หาย จะ**อัปเดตแอปให้คนที่ติดตั้งไปแล้วไม่ได้อีกตลอดไป** — Android ผูก
การอัปเดตไว้กับใบรับรองที่ใช้เซ็น ไม่มีทางกู้ ไม่มีทางขอใหม่ ทางเดียวคือให้ทุกคน
ถอนแอปเดิมแล้วติดตั้งใหม่ ซึ่งข้อมูลในเครื่อง (คิวที่ยังไม่ได้อัปโหลด) หายหมด

สำรองไปเก็บที่อื่นอย่างน้อยหนึ่งที่ ตั้งแต่วันนี้

## สั่ง build

```bash
set -a && . ~/.keystores/slipsummary-release.env && set +a
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```

ได้ไฟล์ที่ `android/app/build/outputs/apk/release/app-release.apk`

**อย่าลืม `-PreactNativeArchitectures`** — ถ้าไม่ใส่ gradle จะ compile native lib
ให้ครบทั้ง 4 ABI แล้วได้ APK **115 MB ซึ่ง 50 MB เป็นโค้ด x86 ที่รันได้แต่บน
emulator** เปล่าประโยชน์สำหรับไฟล์ที่จะส่งให้คนอื่นทาง LINE

| ABI | ขนาด | ใครใช้ |
| --- | --- | --- |
| arm64-v8a | 23.6 MB | มือถือ Android ตั้งแต่ราวปี 2017 เป็นต้นมา = แทบทุกเครื่อง |
| armeabi-v7a | 16.4 MB | เครื่องเก่ากว่านั้น |
| x86 / x86_64 | 50.1 MB | **emulator เท่านั้น** |

APK ที่จำกัด ABI แล้วจะรันบน emulator x86 ไม่ได้

### อยากทดสอบ release บน emulator

ใส่ `x86_64` เพิ่มเข้าไปชั่วคราว — ได้ config release เหมือนกันทุกอย่าง (minify,
JS bundle ฝังในแอพ, ไม่ต่อ Metro, บล็อก cleartext) ต่างแค่ ABI

```bash
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64
```

**สำรอง APK ตัวแจกไว้ก่อน** เพราะ build นี้เขียนทับ `app-release.apk` ชื่อเดียวกัน

ติดตั้งทับแอพ dev ไม่ได้ — package เดียวกันแต่คนละลายเซ็น Android จะปฏิเสธ
ต้อง `adb uninstall com.slipsummary.app` ก่อน ซึ่งจะล้าง session และคิวในเครื่องทิ้ง

build ครั้งแรกใช้เวลา ~44 นาที (compile native ทุกอย่างใหม่) ครั้งถัดไปเร็วกว่ามาก
เพราะ `android/app/build/intermediates/cxx/` ถูก cache ไว้

ถ้าลืม `set -a` build จะหยุดพร้อมบอกว่าไม่มี `SLIP_KEYSTORE_PATH` —
[plugins/with-release-signing.js](../plugins/with-release-signing.js) ตั้งใจให้
หยุด แทนที่จะถอยไปใช้ debug key เงียบ ๆ เพราะ APK ที่เซ็นด้วย debug key
ติดตั้งได้ รันได้ ดูปกติทุกอย่าง แต่อัปเดตทับไม่ได้ตลอดชีวิต

## ตรวจก่อนแจกทุกครั้ง

```bash
APKSIGNER=$(ls "$LOCALAPPDATA/Android/Sdk/build-tools/"*/apksigner.bat | tail -1)

# 1. เซ็นด้วยกุญแจที่ถูกต้องไหม — ต้องเห็น CN=Slip Summary ไม่ใช่ CN=Android Debug
MSYS_NO_PATHCONV=1 "$APKSIGNER" verify -v --print-certs app-release.apk \
  | grep -E "certificate DN|scheme"

# 2. ชี้ไป production ไม่ใช่ 10.0.2.2
unzip -p app-release.apk assets/index.android.bundle | grep -c "10\.0\.2\.2"   # ต้องได้ 0
unzip -p app-release.apk assets/index.android.bundle | grep -q "ocr\.veyout\.com" && echo "ชี้ production ✓"
```

**ต้องใช้ `apksigner` ไม่ใช่ `keytool`** — APK เซ็นด้วย APK Signature Scheme v2
ซึ่งไม่ใช่ JAR signature ดังนั้น `keytool -printcert -jarfile` จะไม่พิมพ์อะไรเลย
แล้วดูเหมือน "ไม่ได้เซ็น" ทั้งที่เซ็นเรียบร้อย

ข้อ 2 สำคัญเพราะ `EXPO_PUBLIC_*` ถูกฝังเข้า bundle **ตอน build** — ถ้า `.env`
ตอนนั้นยังชี้ `10.0.2.2:8000` จะได้ APK ที่ใช้ไม่ได้เลยนอก emulator และไม่มี
อะไรเตือน

## ก่อนขึ้นเวอร์ชันใหม่

เพิ่ม `android.versionCode` ใน [app.json](../app.json) ทุกครั้ง — Android ปฏิเสธ
การติดตั้งทับด้วย versionCode ที่เท่าเดิมหรือต่ำกว่า ส่วน `version` เป็นตัวเลข
ที่คนอ่าน ไม่มีผลทางเทคนิค

## ข้อควรรู้

**Node** ที่เครื่องนี้เป็น 24.2.0 ซึ่งต่ำกว่าที่ React Native 0.86 ประกาศไว้
(`^24.3.0`) — ดู [[machine-node-version]] ใน memory ถ้า release build พังแบบ
แปลก ๆ ให้สงสัยข้อนี้ก่อน

**cleartext** — release build บล็อก `http://` ทั้งหมด (debug manifest เท่านั้น
ที่ตั้ง `usesCleartextTraffic`) OCR service จึงต้องเป็น `https://` เสมอ
