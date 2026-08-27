import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const productsRef = collection(db, "products");
const salesRef = collection(db, "sales");

const result = document.getElementById("scanResult");


// ===============================
// ADD PRODUCT
// ===============================

document
    .getElementById("productForm")
    .addEvntListener("submit", async (e) => {

        e.preventDefault();

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

        const mssage =
            document.getElementById("productMessage");


        if (!name || !barcode || !category) {

            message.textContent =
                "⚠️ Jaza taarifa zote.";

            return;
        }


        try {

            // Angalia kama barcode tayari ipo

            const q = query(
                productsRef,
                where("barcode", "==", barcode)
            );

            const existing =
                await getDocs(q);


            if (!existing.empty) {

               message.textContent =
                    "⚠️ Barcode hii tayari ipo.";

                return;
            }


            // Hifadhi bidhaa

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


            message.textConent =
                "✅ Bidhaa imehifadhiwa.";

            e.target.reset();

            loadProducts();

            loadDashboard();

        }

        catch (error) {

            console.error(error);

            message.textContent =
                "❌ Imeshindikana: " +
                error.message;

        }

    });


// ===============================
// FIND PRODUCT
// ===============================

async function findProduct(barcode) {

    result.innerHTML =
        "<p>⏳ Inatafuta bdhaa...</p>";


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


       if (product.stock <= 0) {

            result.innerHTML = `
                <h3>❌ Bidhaa imeisha</h3>

                <p>
                    <strong>${product.name}</strong>
                </p>

                <p>Stock: 0</p>
            `;

            return;
        }


        // PUNGUZA STOCK

        await updateDoc(
            doc(
                db,
                "products",
                productDoc.id
            ),
            {

                stock: increment(-1),

                old: increment(1)

            }
        );


        // HIFADHI MAUZO

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

                date:
                    Date.now()

            }
        );


        const remaining =
            product.sock - 1;


        result.innerHTML = `

            <h3>✅ Mauzo yamehifadhiwa</h3>

            <p>
                <strong>${product.name}</strong>
            </p>

            <p>
                Bei:
                TSh ${money(product.price)}
            </p>

            <p>
                Stock iliyobaki:
                <strong>${remaining}</strong>
            </p>

        `;


        loadProducts();

        loadDashboard();

    }

    catch (error) {

        console.error(error);

       result.innerHTML = `
            <h3>⚠️ Error</h3>
            <p>${error.message}</p>
        `;

    }

}


// ===============================
// BARCODE SCANNER
// ===============================

function startScanner() {

    const scanner =
        new Html5Qrcode("reader");


    const config = {

        fps: 10,

        qrbox: {
            width: 300,
            height: 150
        },

        aspectRatio: 1.777778

    };


    scanner.start(

        {
            facingMode: "environment
        },

        config,

        (decodedText) => {

            scanner.stop()
                .then(() => {

                    findProduct(decodedText);

                    setTimeout(() => {
                        startScanner();
                    }, 2500);

                });

        },

        () => {

            // scanner inaendelea kusoma

        }

    )
    .catch((error) => {

        console.error(error);

        result.innerHTML = `
            <h3>⚠️ Camera haikufunguka</h3

            <p>
                Ruhusu camera kwenye browser
                kisha refresh ukurasa.
            </p>
        `;

    });

}


// ===============================
// LOAD PRODUCTS
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


            let status = "Ipo";


            if (p.stock === 0) {

                status = "❌ Imeisha";

            }

            else if (p.stock <= 5) {

                status = "⚠️ Karibu kuisha";

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


// ==============================
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
