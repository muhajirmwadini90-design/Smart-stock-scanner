import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    increment,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ================================
// ELEMENTS
// ================================

const productForm = document.getElementById("productForm");
const productMessage = document.getElementById("productMessage");

const productsTable = document.getElementById("prouctsTable");
const salesTable = document.getElementById("salesTable");

const totalProducts = document.getElementById("totalProducts");
const totalStock = document.getElementById("totalStock");
const totalSales = document.getElementById("totalSales");

const refreshProducts = document.getElementById("refreshProducts");

const scanResult = document.getElementById("scanResult");


// ================================
// COLLECTIONS
// ================================

const productsRef = collection(db, "prducts");
const salesRef = collection(db, "sales");


// ================================
// ADD PRODUCT
// ================================

productForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const barcode = document.getElementById("barcode").value.trim();
    const price = Number(document.getElementById("price").value);
    const stock = Number(document.getElementById("stock").value);
    constcategory = document.getElementById("category").value.trim();


    if (!name || !barcode || !category) {

        productMessage.innerHTML =
            "⚠️ Tafadhali jaza taarifa zote.";

        return;
    }


    if (price < 0 || stock < 0) {

        productMessage.innerHTML =
            "⚠️ Bei na stock haviwezi kuwa chini ya sifuri.";

        return;
    }


    try {

        // CHECK BARCODE

        const barcodeQuery = query(
            productsRef,
            where("barcode", "==", barcoe)
        );

        const barcodeSnapshot =
            await getDocs(barcodeQuery);


        if (!barcodeSnapshot.empty) {

            productMessage.innerHTML =
                "⚠️ Barcode hii tayari ipo.";

            return;
        }


        // SAVE PRODUCT

        await addDoc(productsRef, {

            name: name,

            barcode: barcode,

            price: price,

            openingStock: stock,

            stock: stock,

            category: category,

            sold: 0,

           createdAt: new Date().toISOString()

        });


        productMessage.innerHTML =
            "✅ Bidhaa imehifadhiwa kikamilifu.";


        productForm.reset();


        loadProducts();

        loadDashboard();


    } catch (error) {

        console.error(error);

        productMessage.innerHTML =
            "❌ Imeshindikana kuhifadhi bidhaa: " +
            error.message;

    }

});


// ================================
// LOAD PRODUCTS
// ================================

async function loadProducts() {

    try {

        const snapshot =
            await getDocs(productsRef);


        productsTable.innerHTML = "";


        if (snapshot.empty) {

            productsTable.innerHTML = `
                <tr>
                    <td colspan="6">
                        Hakuna bidhaa bado.
                    </td>
                </tr>
            `;

            return;
        }


        snapshot.forEach((item) => {

            const product = item.data();


            let tatus = "Ipo";


            if (product.stock === 0) {

                status = "❌ Imeisha";

            } else if (product.stock <= 5) {

                status = "⚠️ Karibu kuisha";

            }


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>${product.name}</td>

                <td>${product.barcode}</td>

                <td>
                    TSh ${formatMoney(product.price)}
                </td>

                td>${product.stock}</td>

                <td>${product.category}</td>

                <td>${status}</td>

            `;


            productsTable.appendChild(row);

        });


    } catch (error) {

        console.error(error);

        productsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    ❌ Imeshindikana kupakia bidhaa.
                </td>
            </tr>
        `;

    }

}


// ================================
// SCAN BARCODE
// ===============================

function onScanSuccess(decodedText) {

    findProduct(decodedText);

}


function onScanFailure(error) {

    // Scanner inaendelea kutafuta barcode.
}


// ================================
// FIND PRODUCT
// ================================

async function findProduct(barcode) {

    scanResult.innerHTML =
        "<p>⏳ Inatafuta bidhaa...</p>";


    try {

        const productQuery =
            query(
                productsRef,
                where("barcode", "==", barcode)
           );


        const snapshot =
            await getDocs(productQuery);


        if (snapshot.empty) {

            scanResult.innerHTML = `
                <h3>❌ Bidhaa haijapatikana</h3>

                <p>
                    Barcode:
                    <strong>${barcode}</strong>
                </p>
            `;

            return;
        }


        const productDoc =
            snapshot.docs[0];


        const product =
            productDoc.data();


        if (product.stock <=0) {

            scanResult.innerHTML = `

                <h3>⚠️ Bidhaa imeisha</h3>

                <p>
                    <strong>${product.name}</strong>
                </p>

                <p>
                    Stock: 0
                </p>

            `;

            return;
        }


        // REDUCE STOCK

        const productDocument =
            doc(
                db,
                "products",
                productDoc.id
            );


        await updateDoc(
            roductDocument,
            {

                stock: increment(-1),

                sold: increment(1)

            }
        );


        // RECORD SALE

        await addDoc(
            salesRef,
            {

                productId:
                    productDoc.id,

                productName:
                    product.name,

                barcode:
                    product.barcode,

                price:
                    product.price,

                saleDate:
                   new Date().toISOString()

            }
        );


        const newStock =
            product.stock - 1;


        scanResult.innerHTML = `

            <h3>✅ Mauzo yamehifadhiwa</h3>

            <p>
                <strong>${product.name}</strong>
            </p>

            <p>
                Bei:
                TSh ${formatMoney(product.price)}
            </p>

            <p>
                Stock iliyobaki:
                <strong>${newStock}</strong>
            </p>

        `;


       loadProducts();

        loadDashboard();

        loadSales();


    } catch (error) {

        console.error(error);

        scanResult.innerHTML = `

            <h3>❌ Error</h3>

            <p>
                ${error.message}
            </p>

        `;

    }

}


// ================================
// LOAD SALES
// ================================

async function loadSales() {

    try {

        const salesQuery =
             query(
                salesRef,
                orderBy("saleDate", "desc"),
                limit(50)
            );



        const snapshot =
            await getDocs(salesQuery);


        salesTable.innerHTML = "";


        if (snapshot.empty) {

            salesTable.innerHTML = `
                <tr>
                    <td colspan="4">
                        Hakuna mauzo bado.
                    </td>
                </tr>
            `;

            return;
        }


        snapshot.forEach((item) => {

            const sale = item.data();


           const date =
                new Date(
                    sale.saleDate
                );


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${sale.productName}
                </td>

                <td>
                    ${sale.barcode}
                </td>

                <td>
                    TSh ${formatMoney(sale.price)}
                </td>

                <td>
                    ${date.toocaleString("sw-TZ")}
                </td>

            `;


            salesTable.appendChild(row);

        });


    } catch (error) {

        console.error(error);

        salesTable.innerHTML = `
            <tr>
                <td colspan="4">
                    ❌ Imeshindikana kupakia mauzo.
                </td>
            </tr>
        `;

    }

}


// ================================
// DASHBOARD
// ================================

async function loadDashboard() {

    try {

        const productsSnapshot =
            await getDocs(productsRef);


        let productsCount = 0;

        let stockCount = 0;


        productsSnapshot.forEach((item) => {

            const product =
                item.data();


            productsCount++;

            stockCount +=
                Number(product.stock || 0);

        });


        totalProducts.textContent =
            productsCount;


        totalStock.textContent =
            stockCount;


        const salesSnapshot =
           await getDocs(salesRef);


        let salesAmount = 0;


        salesSnapshot.forEach((item) => {

            const sale =
                item.data();


            salesAmount +=
                Number(sale.price || 0);

        });


        totalSales.textContent =
            "TSh " +
            formatMoney(salesAmount);


    } catch (error) {

        console.error(error);

    }

}


// ================================
// REFRESH
// ================================

refreshProducts.addEvntListener(
    "click",
    () => {

        loadProducts();

        loadDashboard();

        loadSales();

    }
);


// ================================
// MONEY FORMAT
// ================================

function formatMoney(amount) {

    return Number(amount).toLocaleString(
        "en-TZ"
    );

}


// ================================
// START SCANNER
// ================================

const scanner =
    new Html5QrcodeScanner(
        "reader",
        {

            fps: 10,

           qrbox: {
                width: 300,
                height: 150
            },

            rememberLastUsedCamera: true

        },

        false
    );


scanner.render(
    onScanSuccess,
    onScanFailure
);


// ================================
// START APP
// ================================

loadProducts();

loadDashboard();

loadSales();