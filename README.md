# NeuroLearn

NeuroLearn is a study tool that takes pasted notes and produces structured summaries. It includes accessible reading modes, text-to-speech with line highlighting, and a focus timer with a task checklist.

## Features

| Feature | Description |
|---|---|
| Summariser | Paste any text and get a bullet-point summary automatically |
| Reading modes | Switch between Default, Low Stimulus, High Contrast, and Dark High Contrast |
| Text-to-speech | Reads your summary aloud and highlights each line as it speaks |
| Language detection | Automatically detects the language of your text and selects the right voice |
| Focus timer | Pomodoro-style timer with adjustable duration and a micro-task checklist |
| Privacy controls | Consent banner, 7-day auto-delete, and a "Delete all my data" button |
| Accessibility | Adjustable font size, line spacing, and reduced motion toggle |

---

## How to run the app

### Requirements
- Python 3.8 or newer
- A modern browser (Chrome or Edge recommended for best text-to-speech support)

### Step 1 — Unzip
Unzip the `neurolearn_app.zip` file. You will get a folder called `neurolearn`.

### Step 2 — Open a terminal in that folder
- On Windows: open the `neurolearn` folder, click the address bar, type `cmd`, press Enter
- Or open Command Prompt / PowerShell and run: `cd path\to\neurolearn`

### Step 3 — Create a virtual environment
```
python -m venv venv
```

### Step 4 — Activate the virtual environment

Windows:
```
venv\Scripts\activate
```

macOS / Linux:
```
source venv/bin/activate
```

You should see `(venv)` appear at the start of your terminal line.

### Step 5 — Install dependencies
```
pip install -r requirements.txt
```

### Step 6 — Start the app
```
python app.py
```

### Step 7 — Open in browser
Go to: **http://127.0.0.1:5000**

The app will create its database automatically on first run. No other setup is needed.

---

## Test texts

Paste any of these into the home page to test summarisation and text-to-speech. Each one is the same sentence translated into a different language so you can compare results.

**English**
> Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of sugar. Without photosynthesis there would be no oxygen in the atmosphere and no organic compounds for other living things to consume.

**Bengali**
> আলোকসংশ্লেষণ হল সেই প্রক্রিয়া যার মাধ্যমে উদ্ভিদ সূর্যালোক, জল এবং কার্বন ডাই-অক্সাইড ব্যবহার করে অক্সিজেন এবং শর্করা উৎপন্ন করে। আলোকসংশ্লেষণ ছাড়া বায়ুমণ্ডলে কোনো অক্সিজেন থাকত না এবং অন্যান্য জীবের জন্য কোনো জৈব যৌগ থাকত না।

**Arabic**
> التمثيل الضوئي هو العملية التي تستخدم فيها النباتات ضوء الشمس والماء وثاني أكسيد الكربون لإنتاج الأكسجين والسكر. بدون التمثيل الضوئي لما كان هناك أكسجين في الغلاف الجوي ولا مركبات عضوية تستهلكها الكائنات الحية الأخرى.

**Hindi**
> प्रकाश संश्लेषण वह प्रक्रिया है जिसके द्वारा पौधे सूर्य के प्रकाश, जल और कार्बन डाइऑक्साइड का उपयोग करके ऑक्सीजन और शर्करा का उत्पादन करते हैं। प्रकाश संश्लेषण के बिना वायुमंडल में कोई ऑक्सीजन नहीं होती और अन्य जीवों के लिए कोई कार्बनिक यौगिक नहीं होते।

**Chinese**
> 光合作用是植物利用阳光、水和二氧化碳来产生氧气和糖分的过程。没有光合作用，大气中就不会有氧气，其他生物也就没有有机物可以消耗。

**Japanese**
> 光合成とは、植物が太陽光、水、二酸化炭素を使って酸素と糖を生産するプロセスです。光合成がなければ、大気中に酸素は存在せず、他の生き物が消費できる有機物もなくなります。

**Korean**
> 광합성은 식물이 햇빛, 물, 이산화탄소를 이용하여 산소와 당분을 생산하는 과정입니다. 광합성이 없다면 대기 중에 산소가 없을 것이고 다른 생물들이 소비할 유기물도 없을 것입니다.

**Russian**
> Фотосинтез — это процесс, с помощью которого растения используют солнечный свет, воду и углекислый газ для производства кислорода и сахара. Без фотосинтеза в атмосфере не было бы кислорода и органических соединений для других живых существ.

**Thai**
> การสังเคราะห์แสงเป็นกระบวนการที่พืชใช้แสงแดด น้ำ และคาร์บอนไดออกไซด์เพื่อผลิตออกซิเจนและน้ำตาล หากไม่มีการสังเคราะห์แสง ก็จะไม่มีออกซิเจนในชั้นบรรยากาศและไม่มีสารประกอบอินทรีย์สำหรับสิ่งมีชีวิตอื่น

**Greek**
> Η φωτοσύνθεση είναι η διαδικασία με την οποία τα φυτά χρησιμοποιούν το ηλιακό φως, το νερό και το διοξείδιο του άνθρακα για να παράγουν οξυγόνο και σάκχαρα. Χωρίς τη φωτοσύνθεση δεν θα υπήρχε οξυγόνο στην ατμόσφαιρα και δεν θα υπήρχαν οργανικές ενώσεις για άλλους οργανισμούς.

**Hebrew**
> פוטוסינתזה היא התהליך שבו צמחים משתמשים באור שמש, מים ודו-תחמוצת הפחמן כדי לייצר חמצן וסוכר. ללא פוטוסינתזה לא היה חמצן באטמוספרה ולא היו תרכובות אורגניות לצריכה על ידי יצורים אחרים.

---

## How requirements map to code

| Requirement | File(s) |
|---|---|
| R1 – Summarisation | `summariser.py`, `app.py` `/summarise` route |
| R2 – Reading modes | `static/style.css`, `static/app.js`, `templates/settings.html` |
| R3 – TTS + highlighting | `static/app.js` `initTTS()`, `templates/reader.html` |
| R4 – Focus timer + tasks | `static/app.js` `initFocusTimer()`, `templates/focus.html`, `app.py` `/focus/*` `/tasks/*` |
| NFR-A – Accessibility | `static/style.css`, `static/app.js` |
| NFR-P – Privacy | `retention.py`, `app.py` `/consent` `/delete-my-data`, `database.py` |


## Known limitations

- Summarisation is extractive only — it selects key sentences rather than generating new text, so it works best with longer passages
- Text-to-speech voice availability depends on the browser — Chrome and Edge have the widest range of voices
- Single demo user with no login or authentication
- Only pasted plain text is supported — no file upload
- Consent expires after 7 days and must be given again
[
](https://github.com/elizazh/neurolearn_33750790)
