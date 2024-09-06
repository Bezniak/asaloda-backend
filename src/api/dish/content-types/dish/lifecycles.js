module.exports = {
  async afterCreate(event) {
    console.log('afterCreate hook triggered');

    const { result } = event;
    console.log('Dish created:', result);

    // Извлекаем данные нового блюда
    const { date, program_type } = result;
    // console.log('Новое блюдо:', result);

    try {
      // Преобразуем дату в объект Date
      const dishDate = new Date(date);
      console.log('Дата блюда:', dishDate);

      // Получаем все заказы
      const orders = await strapi.db.query('api::order.order').findMany({
        populate: ['dishes'] // Убедитесь, что dishes заполняются
      });

      // Проверяем, является ли orders массивом и содержит ли он элементы
      if (Array.isArray(orders) && orders.length > 0) {
        console.log('Количество заказов:', orders.length);

        // Проходим по всем заказам
        for (const order of orders) {
          const {
            startDate,
            endDate,
            excludeSaturday,
            excludeSunday,
            programName,
            dishes
          } = order;

          // Преобразуем startDate и endDate в объекты Date
          const orderStartDate = new Date(startDate);
          const orderEndDate = new Date(endDate);

          console.log('Дата начала заказа:', orderStartDate);
          console.log('Дата окончания заказа:', orderEndDate);

          // Проверяем, попадает ли дата блюда в диапазон дат заказа
          const isWithinDateRange = dishDate >= orderStartDate && dishDate <= orderEndDate;
          console.log('Блюдо в диапазоне дат заказа:', isWithinDateRange);

          // Проверка, если дата блюда - суббота или воскресенье
          const isSaturday = dishDate.getDay() === 6;
          const isSunday = dishDate.getDay() === 0;

          // Проверяем, если excludeSaturday или excludeSunday = true, и дата выпадает на субботу или воскресенье
          if ((isSaturday && excludeSaturday) || (isSunday && excludeSunday)) {
            console.log('Блюдо выпадает на выходной и исключено заказом:', order.id);
            continue; // Пропускаем этот заказ
          }

          // Проверяем соответствие программы блюда и заказа
          const isProgramMatch = program_type === programName;
          console.log('Программа блюда совпадает с программой заказа:', isProgramMatch);

          // Если все условия выполнены, добавляем блюдо в заказ
          if (isWithinDateRange && isProgramMatch) {
            // Проверяем, что массив dishes существует и является массивом
            const currentDishes = Array.isArray(dishes) ? dishes.map(d => d.id) : [];

            // Проверяем, не добавлено ли уже это блюдо в заказ
            if (!currentDishes.includes(result.id)) {
              // Добавляем блюдо в заказ
              await strapi.db.query('api::order.order').update({
                where: { id: order.id },
                data: {
                  dishes: [...currentDishes, result.id], // Добавляем ID блюда
                },
              });
              console.log(`Блюдо ${result.id} добавлено в заказ ${order.id}`);
            } else {
              console.log(`Блюдо ${result.id} уже добавлено в заказ ${order.id}`);
            }
          }
        }
      } else {
        console.error('Orders is undefined or not an array');
      }
    } catch (error) {
      console.error('Ошибка при добавлении блюда в заказы:', error);
    }
  },
};
