# DebtOS

A minimal, elegant personal debt tracker PWA built with vanilla JavaScript, CSS, and HTML.

![Language](https://img.shields.io/badge/JavaScript-43.5%25-yellow) ![Language](https://img.shields.io/badge/CSS-39.9%25-blue) ![Language](https://img.shields.io/badge/HTML-16.6%25-orange)

## 🎯 Features

- **Dashboard Overview** – See total debt, interest costs (per year/month/day/hour), and live interest accrual
- **Debt Management** – Add, edit, delete debts with custom interest rates
- **Interest Tracking** – Automatically calculates interest costs across multiple time periods
- **Quick Payment** – Record payments against individual debts
- **Session Lock** – PIN-protected with session-based authentication
- **Live Ticker** – Real-time interest accrual counter
- **PWA Support** – Install as standalone app on mobile/desktop
- **Offline Ready** – Works with localStorage persistence
- **Dark Mode Ready** – Clean, minimal UI with accessibility support
- **Thai Baht (฿) Currency** – Localized number formatting

## 🚀 Quick Start

### Online
Visit: **[DebtOS Live](https://sirtnax.github.io/MinimalDebtOS/)**

### Local Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Sirtnax/MinimalDebtOS.git
   cd MinimalDebtOS
   ```
2. Serve locally (requires a local server):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (http-server)
   npx http-server
   
   # PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser

### PWA Installation
1. Visit the app on desktop or mobile
2. **Desktop**: Click the install button (⬇️) in address bar
3. **Mobile**: Tap the share menu → "Add to Home Screen"

## 🔐 Security Note

The PIN lock is **UI-only protection** and provides no server-side security. Anyone with direct access to browser storage can view the data. This is suitable for:
- ✅ Privacy from casual observers
- ❌ Not suitable for highly sensitive data on shared devices

**Setting your PIN:** After first install, open browser console (F12) and run:
```javascript
await setPin('your4digitpin')
```
Then reload. Your PIN is stored as a SHA-256 hash — the raw PIN never appears in source code or storage.

Always enable device-level security (PIN/biometric) for sensitive use cases.

## 📱 Usage

### Overview Tab
- View total outstanding debt
- See average interest rate (weighted)
- Monitor total amount paid
- Check interest costs across different time periods
- Watch live interest accrual in real-time

### Debts Tab
- **Add Debt**: Click the `+` button
- **Edit Debt**: Tap any debt card
- **Delete Debt**: Open debt editor → click "Delete"
- **Record Payment**: Use "Quick Pay" section in debt editor

### Debt Fields
- **Name**: Lender name (required)
- **Balance**: Current outstanding amount (required)
- **Interest/yr**: Annual interest rate as decimal (e.g., `0.25` = 25%)
- **Limit**: Credit limit (optional, for reference)
- **Due Date**: Day of month (optional, e.g., `5`, `15`, `31`)

## 🛠️ Project Structure

```
MinimalDebtOS/
├── index.html          # Main PWA markup & UI structure
├── app.js              # Core logic (CRUD, calculations, state)
├── styles.css          # Responsive design & animations
├── manifest.json       # PWA configuration
├── icon-192.png        # PWA icon (192×192)
├── icon-512.png        # PWA icon (512×512)
└── README.md          # This file
```

## 💾 Data Storage

All data is stored locally in browser `localStorage` under the key `debtos_v7`:
- **Debts array** – All debt entries with rates, balances, etc.
- **Total paid** – Cumulative payments recorded
- **Last saved timestamp** – Track when data was last updated

Data is never sent to any server and remains entirely on your device.

## 🎨 Design Features

- **Minimal aesthetic** – Clean, distraction-free interface
- **Responsive** – Works on phones, tablets, desktop
- **Fast** – Vanilla JS, no frameworks
- **Accessible** – ARIA labels, keyboard navigation, semantic HTML
- **Safe scrolling** – Uses `notch-safe` areas for modern phones

## 🔄 Interest Calculations

Interest is calculated based on annual rate (decimal):

```
Interest per year  = Sum of (debt × annual_rate)
Interest per month = Interest per year ÷ 12
Interest per day   = Interest per year ÷ 365
Interest per hour  = Interest per year ÷ 8760
Interest per sec   = Interest per year ÷ 31,536,000
```

The "Accrued this session" ticker updates in real-time as you browse.

## 🌐 Browser Support

| Browser | Support |
|---------|---------|
| Chrome/Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full (iOS 13+) |
| IE 11 | ❌ Not supported |

## 📦 Dependencies

**Zero external dependencies** – Pure vanilla JavaScript/CSS/HTML

## 🤝 Contributing

Contributions welcome! To improve DebtOS:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## 💡 Feature Ideas

- [ ] Payment history/timeline view
- [ ] Charts & debt breakdown visualization
- [ ] Due date reminders & notifications
- [ ] Multi-language localization
- [ ] Data export (JSON/CSV)
- [ ] Dark mode toggle
- [ ] Debt payoff calculator/strategies
- [ ] Recurring debt payments

## 📝 License

This project is licensed under the **MIT License** – see [LICENSE](LICENSE) file for details.

## 🙋 Support

Having issues? 
1. Check browser console for errors (`F12` → Console tab)
2. Verify `localStorage` is enabled
3. Try clearing app data and reinstalling
4. [Open an issue](https://github.com/Sirtnax/MinimalDebtOS/issues) on GitHub

---

**Made with ❤️ by [Sirtnax](https://github.com/Sirtnax)**

*Last updated: May 2026*
