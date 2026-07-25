// multiselect.js
// Componente combobox con búsqueda, reutilizable para selección única o múltiple.

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina",
  "Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados",
  "Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina",
  "Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada",
  "Central African Republic","Chad","Chile","China","Colombia","Comoros","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Democratic Republic of the Congo","Denmark",
  "Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador",
  "Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea",
  "Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia",
  "Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon",
  "Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania",
  "Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
  "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua",
  "Niger","Nigeria","North Korea",
  "North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Republic of the Congo","Romania","Russia","Rwanda","Saint Kitts and Nevis",
  "Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone",
  "Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa",
  "South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden",
  "Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo",
  "Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay",
  "Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

const PROFESSIONAL_FIELDS = [
  "Engineering","Medicine","Nursing","Business Administration","Economics","Finance",
  "Accounting","Marketing","Law","Political Science","International Relations",
  "Computer Science","Software Engineering","Data Science","Artificial Intelligence",
  "Cybersecurity","Mathematics","Physics","Chemistry","Biology","Biotechnology",
  "Environmental Science","Architecture","Civil Engineering","Mechanical Engineering",
  "Electrical Engineering","Industrial Engineering","Chemical Engineering",
  "Psychology","Sociology","Education","Journalism","Communications",
  "Graphic Design","Fine Arts","Music","Film and Media","Philosophy","History",
  "Anthropology","Agriculture","Veterinary Medicine","Public Health","Dentistry",
  "Pharmacy","Nutrition","Sports Science","Hospitality Management","Tourism",
  "Culinary Arts","Fashion Design","Linguistics","Translation and Interpretation",
  "Urban Planning","Renewable Energy","Robotics","Aerospace Engineering",
  "Human Resources","Supply Chain Management","Entrepreneurship"
];

class MultiSelect {
  constructor(containerId, options, { mode = "multi", hiddenInputId }) {
    this.container = document.getElementById(containerId);
    this.hiddenInput = document.getElementById(hiddenInputId);
    this.options = options;
    this.mode = mode; // "single" | "multi"
    this.selected = [];

    this.tagsBox = this.container.querySelector(".ms-tags");
    this.search = this.container.querySelector(".ms-search");
    this.panel = this.container.querySelector(".ms-panel");

    this.init();
  }

  init() {
    this.search.addEventListener("input", () => this.handleFilter());
    this.search.addEventListener("focus", () => this.handleFilter());

    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target)) this.closePanel();
    });
  }

  handleFilter() {
    const q = this.search.value.trim().toLowerCase();
    const available = this.options.filter(o => !this.selected.includes(o));
    const filtered = q
      ? available.filter(o => o.toLowerCase().includes(q))
      : available;
    this.renderPanel(filtered);
    this.openPanel();
  }

  openPanel() { this.panel.classList.add("open"); }
  closePanel() { this.panel.classList.remove("open"); }

  renderPanel(list) {
    this.panel.innerHTML = "";

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ms-empty";
      empty.textContent = "No results";
      this.panel.appendChild(empty);
      return;
    }

    list.slice(0, 50).forEach(option => {
      const item = document.createElement("div");
      item.className = "ms-option";
      item.textContent = option;
      item.addEventListener("click", () => this.select(option));
      this.panel.appendChild(item);
    });
  }

  select(option) {
    if (this.mode === "single") {
      this.selected = [option];
      this.closePanel();
    } else if (!this.selected.includes(option)) {
      this.selected.push(option);
    }

    this.search.value = "";
    this.renderTags();
    this.updateHidden();

    if (this.mode === "multi") this.handleFilter();
  }

  remove(option) {
    this.selected = this.selected.filter(o => o !== option);
    this.renderTags();
    this.updateHidden();
  }

  renderTags() {
    this.tagsBox.innerHTML = "";
    this.selected.forEach(option => {
      const tag = document.createElement("span");
      tag.className = "ms-tag";

      const label = document.createElement("span");
      label.textContent = option;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", `Remove ${option}`);
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.remove(option);
      });

      tag.appendChild(label);
      tag.appendChild(removeBtn);
      this.tagsBox.appendChild(tag);
    });
  }

  updateHidden() {
    this.hiddenInput.value = this.selected.join(", ");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MultiSelect("nationality_select", COUNTRIES, {
    mode: "single",
    hiddenInputId: "nationality"
  });

  new MultiSelect("countries_interest_select", COUNTRIES, {
    mode: "multi",
    hiddenInputId: "countries_interest"
  });

  new MultiSelect("professional_interest_select", PROFESSIONAL_FIELDS, {
    mode: "multi",
    hiddenInputId: "professional_interest"
  });
});