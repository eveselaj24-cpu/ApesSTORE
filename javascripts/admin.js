import { PRODUCTS_KEY, formatMoney, getDefaultProducts, loadProducts, makeElement, saveProducts } from './store.js';
import { endAdminSession, hasAdminSession, startAdminSession } from './admin-session.js';

// ---------- Page elements ----------
const loginCard = document.getElementById('adminAccessCard');
const loginForm = document.getElementById('adminLoginForm');
const emailInput = document.getElementById('adminEmail');
const passwordInput = document.getElementById('adminPassword');
const loginMessage = document.getElementById('adminMessage');
const dashboard = document.getElementById('adminDashboard');
const signOutButton = document.getElementById('signOutButton');

const productTableBody = document.getElementById('productTableBody');
const productCountText = document.getElementById('productCount');
const productMessage = document.getElementById('productMessage');
const addProductButton = document.getElementById('addProductButton');

const productForm = document.getElementById('productForm');
const productFormTitle = document.getElementById('productFormTitle');
const idInput = document.getElementById('productId'); // hidden field, empty when adding
const nameInput = document.getElementById('productName');
const categoryInput = document.getElementById('productCategory');
const priceInput = document.getElementById('productPrice');
const stockInput = document.getElementById('productStock');
const saveProductButton = document.getElementById('saveProductButton');
const cancelProductButton = document.getElementById('cancelProductButton');
const discardProductButton = document.getElementById('discardProductButton');

// ---------- Data ----------
const ADMIN_EMAIL = 'admin@apexstore.test';
const ADMIN_PASSWORD = 'admin123';

let products = [];
try {
  products = loadProducts();
} catch (error) {
  products = getDefaultProducts();
  productMessage.textContent = 'Saved products could not be loaded. Showing the sample list instead.';
}

// ---------- Show the products in the table ----------
function showProducts() {
  productTableBody.replaceChildren(); // clear the table first
  productCountText.textContent = products.length === 1 ? '1 product' : products.length + ' products';

  if (products.length === 0) {
    const row = makeElement('tr');
    const cell = makeElement('td', 'No products yet. Add your first product.');
    cell.colSpan = 6;
    row.append(cell);
    productTableBody.append(row);
    return;
  }

  for (const product of products) {
    const row = makeElement('tr');
    row.append(
      makeElement('td', product.id),
      makeElement('td', product.name),
      makeElement('td', product.category),
      makeElement('td', formatMoney(product.price)),
      makeElement('td', product.stock),
    );

    // Edit and Delete buttons for this product
    const editButton = makeElement('button', 'Edit', 'table-action');
    editButton.type = 'button';
    editButton.addEventListener('click', function () {
      openProductForm(product);
    });

    const deleteButton = makeElement('button', 'Delete', 'table-action delete-action');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', function () {
      deleteProduct(product);
    });

    const actionsCell = makeElement('td', undefined, 'table-actions');
    actionsCell.append(editButton, deleteButton);
    row.append(actionsCell);

    productTableBody.append(row);
  }
}

// ---------- Show / hide the login and the dashboard ----------
function showDashboard() {
  loginCard.hidden = true;
  dashboard.hidden = false;
  showProducts();
}

function showLogin() {
  dashboard.hidden = true;
  loginCard.hidden = false;
  loginForm.reset();
  loginMessage.textContent = '';
}

// ---------- The add / edit form ----------
// Pass a product to edit it, or nothing to add a new one.
function openProductForm(product) {
  productForm.reset();
  productMessage.textContent = '';
  productForm.hidden = false;

  if (product) {
    productFormTitle.textContent = 'Edit product #' + product.id;
    saveProductButton.textContent = 'Save changes';
    idInput.value = product.id;
    nameInput.value = product.name;
    categoryInput.value = product.category;
    priceInput.value = product.price;
    stockInput.value = product.stock;
  } else {
    productFormTitle.textContent = 'Add product';
    saveProductButton.textContent = 'Save product';
  }

  nameInput.focus();
}

function closeProductForm() {
  productForm.reset();
  productForm.hidden = true;
}

// ---------- Saving ----------
// Saves the new list. Returns true if it worked, false if not.
function saveProductList(newProducts, successMessage) {
  try {
    saveProducts(newProducts);
  } catch (error) {
    productMessage.textContent = 'Could not save product changes in this browser. Check storage permissions and try again.';
    return false;
  }

  products = newProducts;
  showProducts();
  productMessage.textContent = successMessage;
  return true;
}

function deleteProduct(product) {
  const sure = window.confirm('Delete "' + product.name + '"?');
  if (sure === false) return;

  const remaining = products.filter(function (item) {
    return item.id !== product.id;
  });
  saveProductList(remaining, product.name + ' was deleted.');
}

// ---------- Events ----------
loginForm.addEventListener('submit', function (event) {
  event.preventDefault(); // stop the page from reloading

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    loginMessage.textContent = 'Email or password is incorrect.';
    return;
  }

  loginMessage.textContent = '';
  startAdminSession();
  showDashboard();
});

signOutButton.addEventListener('click', function () {
  endAdminSession();
  closeProductForm();
  showLogin();
});

addProductButton.addEventListener('click', function () {
  openProductForm();
});

cancelProductButton.addEventListener('click', closeProductForm);
discardProductButton.addEventListener('click', closeProductForm);

productForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const price = Number(priceInput.value);
  const stock = Number(stockInput.value);

  if (name === '' || category === '' || price < 0 || Number.isNaN(price) ||
      !Number.isInteger(stock) || stock < 0) {
    productMessage.textContent = 'Enter a name, category, valid price, and whole-number stock.';
    return;
  }

  if (idInput.value !== '') {
    // Editing: replace the product that has this id
    const editedId = Number(idInput.value);
    const newProducts = products.map(function (product) {
      if (product.id === editedId) {
        return { id: editedId, name: name, category: category, price: price, stock: stock };
      }
      return product;
    });
    if (saveProductList(newProducts, name + ' was updated.')) closeProductForm();
  } else {
    // Adding: the new id is the highest existing id + 1
    let highestId = 0;
    for (const product of products) {
      if (product.id > highestId) highestId = product.id;
    }
    const newProduct = { id: highestId + 1, name: name, category: category, price: price, stock: stock };
    const newProducts = [...products, newProduct];
    if (saveProductList(newProducts, name + ' was added.')) closeProductForm();
  }
});

// Runs when another browser tab changes the saved products
window.addEventListener('storage', function (event) {
  if (event.key !== PRODUCTS_KEY && event.key !== null) return;

  try {
    products = loadProducts();
    showProducts();
  } catch (error) {
    productMessage.textContent = 'Product updates could not be loaded from the other tab.';
  }
});

// ---------- Start ----------
if (hasAdminSession()) {
  loginCard.hidden = true;
  dashboard.hidden = false;
}
showProducts();