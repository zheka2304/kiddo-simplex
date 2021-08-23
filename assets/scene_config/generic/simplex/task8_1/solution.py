import player
import console

# открыть консоль
player.interact()

# контольная сумма текущего блока
checksum = 0
# предыдущее прочитанное значение
last = 0

# пока в консоли есть значения
while console.has_more():
    # прочитать следующее значение
    value = console.read()

    # если 0 - значит это конец пакета
    # и предыдущее значение - контрольная сумма
    if value == 0:
        # сравнить посчитанную и прочитанную контрольные суммы
        if last == checksum:
            # если совпадают - записать 1
            console.write(1)
        else:
            # если не совпадают - записать 0
            console.write(0)
        # обнулить переменные предыдущего элемента и контрольной суммы
        checksum = last = 0

    # иначе пакет еще не закончился
    else:
        # Добавить прошлое значение к контрольной сумме.
        # Мы используем прошлое значение вместо текущего,
        # чтобы не добавить последнее значение в пакете,
        # которое само по себе является контрольной суммой.
        checksum += last

        # делаем текущее значение предыдущим
        last = value

# закрыть консоль
console.close()