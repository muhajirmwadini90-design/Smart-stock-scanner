import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const productsRef = collection(db, "products");
const salesRef = collection(db, "sales");

const form = document.getElementById("productForm");
const message = document.getElementById("productMessage");
const result = document.getElementById("scanResult");


// ===============================
// FORMAT MONEY
// ===============================

function money(value) {
    return Number(value || 0).toLocaleString("en-TZ");
}


// ===============================
// ADD PRODUCT
// ===============================

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name =
        document.getElementById("productName").value.trim();

    const barcode =
        document.getElementById("barcode").value.trim();

    const price =
        Number(document.getElementById("price").value);

    const stock =
        Number(document.getElementById("stock").value);

    const category =
        document.getElementById("category").value.trim();


    if (!name || !barcode || !category) {
        message.textContent = "⚠️ Jaza taarifa zote.";
        return;
    }


    try {

        // CHECK BARCODE

        const q = query(
            productsRef,
            where("barcode", "==", barcode)
        );

        const existing = await getDocs(q);


        if (!existing.empty) {

            message.textContent =
                "⚠️ Barcode hii tayari ipo.";

            return;
        }


        // SAVE PRODUCT

        await addDoc(productsRef, {

            name: name,
            barcode: barcode,
            price: price,
            stock: stock,
            openingStock: stock,
            sold: 0,
            category: category,
            createdAt: Date.now()

        });


        message.textContent =
            "✅ Bidhaa imehifadhiwa.";

        form.reset();

        loadProducts();
        loadDashboard();

    }

    catch (error) {

        console.error(error);

        message.textContent =
            "❌ " + error.message;

    }

});


// ===============================
// FIND / SELL PRODUCT
// ===============================

async function sellProduct(barcode) {

    barcode = String(barcode).trim();


    if (!barcode) {

        result.textContent =
            "⚠️ Barcode haijawekwa.";

        return;
    }


    result.textContent =
        "⏳ Inatafuta bidhaa...";


    try {

        const q = query(
            productsRef,
            where("barcode", "==", barcode)
        );


        const snapshot =
            await getDocs(q);


        if (snapshot.empty) {

            result.innerHTML = `
                <h3>❌ Bidhaa haipo</h3>
                <p>Barcode: ${barcode}</p>
            `;

            return;
        }


        const productDoc =
            snapshot.docs[0];

        const product =
            productDoc.data();


        // CHECK STOCK

        if (Number(product.stock) <= 0) {

            result.innerHTML = `
                <h3>❌ Bidhaa imeisha</h3>
                <p>${product.name}</p>
                <p>Stock: 0</p>
            `;

            return;
        }


        // REDUCE STOCK

        await updateDoc(
            doc(
                db,
                "products",
                productDoc.id
            ),
            {
                stock: increment(-1),
                sold: increment(1)
            }
        );


        // SAVE SALE

        await addDoc(
            salesRef,
            {
                productId: productDoc.id,
                productName: product.name,
                barcode: product.barcode,
                price: Number(product.price),
                date: Date.now()
            }
        );


        const remaining =
            Number(product.stock) - 1;


        result.innerHTML = `
            <h3>✅ Mauzo yamehifadhiwa</h3>

            <p>
                Bidhaa:
                <strong>${product.name}</strong>
            </p>

            <p>
                Bei:
                <strong>TSh ${money(product.price)}</strong>
            </p>

            <p>
                Stock iliyobaki:
                <strong>${remaining}</strong>
            </p>
        `;


        loadProducts();
        loadDashboard();
        loadSales();

    }

    catch (error) {

        console.error(error);

        result.innerHTML = `
            <p>❌ ${error.message}</p>
        `;

    }

}


// ===============================
// CAMERA BARCODE SCANNER
// ===============================

let scanner = null;
let scannerRunning = false;


document
    .getElementById("startScanner")
    .addEventListener("click", async () => {


        if (scannerRunning) {
            return;
        }


        if (typeof Html5Qrcode === "undefined") {

            result.innerHTML = `
                <p>
                    ❌ Scanner library haijapakia.
                    Refresh ukurasa.
                </p>
            `;

            return;
        }


        try {

            scanner =
                new Html5Qrcode("reader");


            scannerRunning = true;


            result.innerHTML =
                "<p>📷 Inafungua camera...</p>";


            await scanner.start(

                {
                    facingMode: "environment"
                },

                {
                    fps: 10,

                    qrbox: {
                        width: 300,
                        height: 150
                    }
                },

                async (decodedText) => {

                    await scanner.stop();

                    scanner.clear();

                    scannerRunning = false;

                    await sellProduct(
                        decodedText
                    );

                },

                () => {

                    // Inaendelea kuscan

                }

            );


            result.innerHTML = `
                <p>
                    📷 Camera imefunguka.
                    Elekeza kwenye barcode.
                </p>
            `;

        }

        catch (error) {

            console.error(error);

            scannerRunning = false;


            result.innerHTML = `
                <h3>❌ Camera haijafunguka</h3>

                <p>
                    Hakikisha umeipa website
                    ruhusa ya kutumia camera.
                </p>
            `;

        }

    });


// ===============================
// MANUAL BARCODE
// ===============================

document
    .getElementById("manualSearch")
    .addEventListener("click", () => {

        const barcode =
            document
                .getElementById("manualBarcode")
                .value;

        sellProduct(barcode);

    });


// ===============================
// PRODUCTS TABLE
// ===============================

async function loadProducts() {

    const table =
        document.getElementById("productsTable");


    try {

        const snapshot =
            await getDocs(productsRef);


        table.innerHTML = "";


        if (snapshot.empty) {

            table.innerHTML = `
                <tr>
                    <td colspan="6">
                        Hakuna bidhaa bado.
                    </td>
                </tr>
            `;

            return;
        }


        snapshot.forEach((item) => {

            const p =
                item.data();


            let status = "✅ Ipo";


            if (Number(p.stock) === 0) {

                status = "❌ Imeisha";

            }

            else if (Number(p.stock) <= 5) {

                status =
                    "⚠️ Karibu kuisha";

            }


            table.innerHTML += `

                <tr>

                    <td>${p.name}</td>

                    <td>${p.barcode}</td>

                    <td>
                        TSh ${money(p.price)}
                    </td>

                    <td>${p.stock}</td>

                    <td>${p.category}</td>

                    <td>${status}</td>

                </tr>

            `;

        });

    }

    catch (error) {

        console.error(error);

    }

}


// ===============================
// SALES TABLE
// ===============================

async function loadSales() {

    const table =
        document.getElementById("salesTable");


    try {

        const snapshot =
            await getDocs(salesRef);


        table.innerHTML = "";


        if (snapshot.empty) {

            table.innerHTML = `
                <tr>
                    <td colspan="4">
                        Hakuna mauzo bado.
                    </td>
                </tr>
            `;

            return;
        }


        snapshot.forEach((item) => {

            const sale =
                item.data();


            const date =
                new Date(sale.date);


            table.innerHTML += `

                <tr>

                    <td>
                        ${sale.productName}
                    </td>

                    <td>
                        ${sale.barcode}
                    </td>

                    <td>
                        TSh ${money(sale.price)}
                    </td>

                    <td>
                        ${date.toLocaleString("sw-TZ")}
                    </td>

                </tr>

            `;

        });

    }

    catch (error) {

        console.error(error);

    }

}


// ===============================
// DASHBOARD
// ===============================

async function loadDashboard() {

    try {

        const products =
            await getDocs(productsRef);


        let stock = 0;


        products.forEach((item) => {

            const p =
                item.data();

            stock +=
                Number(p.stock || 0);

        });


        document.getElementById(
            "totalProducts"
        ).textContent =
            products.size;


        document.getElementById(
            "totalStock"
        ).textContent =
            stock;


        const sales =
            await getDocs(salesRef);


        let total = 0;


        sales.forEach((item) => {

            const sale =
                item.data();

            total +=
                Number(sale.price || 0);

        });


        document.getElementById(
            "totalSales"
        ).textContent =
            "TSh " + money(total);

    }

    catch (error) {

        console.error(error);

    }

}


// ===============================
// START SYSTEM
// ===============================

loadProducts();
loadSales();
loadDashboard();
// ===============================
// REPORTS
// ===============================

document
    .getElementById("generateReport")
    .addEventListener("click", generateReport);


async function generateReport() {

    const start =
        document.getElementById("reportStart").value;

    const end =
        document.getElementById("reportEnd").value;

    const report =
        document.getElementById("reportResult");


    if (!start || !end) {

        report.innerHTML = `
            <p>⚠️ Chagua tarehe ya kuanzia
            na tarehe ya mwisho.</p>
        `;

        return;
    }


    if (start > end) {

        report.innerHTML = `
            <p>⚠️ Tarehe ya kuanzia
            haiwezi kuwa baada ya tarehe ya mwisho.</p>
        `;

        return;
    }


    report.innerHTML =
        "<p>⏳ Inatengeneza ripoti...</p>";


    try {

        const snapshot =
            await getDocs(salesRef);


        let totalSales = 0;

        let numberOfSales = 0;

        const productsSold = {};


        snapshot.forEach((item) => {

            const sale =
                item.data();


            const saleDate =
                new Date(sale.date);


            const year =
                saleDate.getFullYear();

            const month =
                String(
                    saleDate.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    saleDate.getDate()
                ).padStart(2, "0");


            const saleDateString =
                `${year}-${month}-${day}`;


            // CHECK DATE RANGE

            if (
                saleDateString >= start &&
                saleDateString <= end
            ) {

                const price =
                    Number(sale.price || 0);


                totalSales += price;

                numberOfSales++;


                // COUNT PRODUCTS

                const name =
                    sale.productName ||
                    "Bidhaa";


                if (!productsSold[name]) {

                    productsSold[name] = 0;

                }


                productsSold[name]++;

            }

        });


        // PRODUCT ROWS

        let productRows = "";


        const sortedProducts =
            Object.entries(productsSold)
                .sort((a, b) => b[1] - a[1]);


        if (sortedProducts.length === 0) {

            productRows = `
                <tr>
                    <td colspan="2">
                        Hakuna mauzo katika kipindi hiki.
                    </td>
                </tr>
            `;

        }

        else {

            sortedProducts.forEach(
                ([name, quantity]) => {

                    productRows += `

                        <tr>

                            <td>
                                ${name}
                            </td>

                            <td>
                                ${quantity}
                            </td>

                        </tr>

                    `;

                }
            );

        }


        // DISPLAY REPORT

        report.innerHTML = `

            <h3>
                📊 Ripoti ya ${start} hadi ${end}
            </h3>


            <div class="report-summary">

                <div class="report-card">

                    Mauzo

                    <strong>
                        TSh ${money(totalSales)}
                    </strong>

                </div>


                <div class="report-card">

                    Idadi ya Mauzo

                    <strong>
                        ${numberOfSales}
                    </strong>

                </div>


                <div class="report-card">

                    Bidhaa Zilizouzwa

                    <strong>
                        ${Object.keys(productsSold).length}
                    </strong>

                </div>

            </div>


            <h3>
                Bidhaa Zilizouzwa
            </h3>


            <div class="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Bidhaa
                            </th>

                            <th>
                                Idadi
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${productRows}

                    </tbody>

                </table>

            </div>

        `;

    }

    catch (error) {

        console.error(error);

        report.innerHTML = `
            <p>
                ❌ Imeshindwa kutengeneza ripoti:
                ${error.message}
            </p>
        `;

    }

}
// ===============================
// SCAN BARCODE WHILE ADDING PRODUCT
// ===============================

let productBarcodeScanner = null;
let productBarcodeScanning = false;

document
    .getElementById("scanProductBarcode")
    .addEventListener("click", async () => {

        const message =
            document.getElementById(
                "productBarcodeMessage"
            );

        if (productBarcodeScanning) {
            return;
        }

        if (typeof Html5Qrcode === "undefined") {

            message.textContent =
                "❌ Scanner library haijapakia.";

            return;
        }

        try {

            productBarcodeScanner =
                new Html5Qrcode(
                    "productBarcodeScanner"
                );

            productBarcodeScanning = true;

            message.textContent =
                "📷 Elekeza camera kwenye barcode...";

            await productBarcodeScanner.start(

                {
                    facingMode: "environment"
                },

                {
                    fps: 10,

                    qrbox: {
                        width: 300,
                        height: 150
                    }
                },

                async (decodedText) => {

                    document.getElementById(
                        "barcode"
                    ).value = decodedText;

                    message.textContent =
                        "✅ Barcode imesomwa: " +
                        decodedText;

                    await productBarcodeScanner.stop();

                    productBarcodeScanner.clear();

                    productBarcodeScanning =
                        false;

                },

                () => {
                    // Inaendelea kusoma
                }

            );

        }

        catch (error) {

            console.error(error);

            productBarcodeScanning = false;

            message.textContent =
                "❌ Camera haijafunguka. Ruhusu camera kwenye browser.";

        }

    });
