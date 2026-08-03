let deleteProductId = null;

const deleteModal = new bootstrap.Modal(
    document.getElementById("deleteModal")
);

/* ===========================================
   Open Delete Modal
=========================================== */

function deleteProduct(id) {

    deleteProductId = id;

    deleteModal.show();

}

/* ===========================================
   Confirm Delete
=========================================== */

document
    .getElementById("confirmDeleteBtn")
    ?.addEventListener("click", async () => {

        if (!deleteProductId) return;

        try {

            const response = await fetch(

                `/product/${deleteProductId}`,

                {
                    method: "DELETE",
                }

            );

            const data = await response.json();

            if (data.success) {

                deleteModal.hide();

                location.reload();

            } else {

                alert(data.message);

            }

        } catch (err) {

            console.error(err);

            alert("Unable to delete product.");

        }

    });

/* ===========================================
   Select All
=========================================== */

const selectAll = document.querySelector("thead input[type='checkbox']");

if (selectAll) {

    selectAll.addEventListener("change", function () {

        document
            .querySelectorAll("tbody input[type='checkbox']")
            .forEach(cb => {

                cb.checked = this.checked;

            });

    });

}

/* ===========================================
   Simple Search
=========================================== */

const searchInput = document.querySelector(
    "input[placeholder='Name or SKU']"
);

if (searchInput) {

    searchInput.addEventListener("keyup", function () {

        const value = this.value.toLowerCase();

        document
            .querySelectorAll("tbody tr")
            .forEach(row => {

                row.style.display =
                    row.innerText.toLowerCase().includes(value)
                        ? ""
                        : "none";

            });

    });

}