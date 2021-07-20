function getStyle(element) {
    if (!element.style) {
        // 用一个新的style对象存储新增的css计算属性
        element.style = {}
    }

    for (let prop in element.computedStyle) {
        var p = element.computedStyle.value
        element.style[prop] = element.computedStyle[prop].value

        // 将style中带有px和纯数字的属性值转换为整数
        if (element.style[prop].toString().match(/px$/)) {
            element.style[prop] = parseInt(element.style[prop])
        }
        if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
            element.style[prop] = parseInt(element.style[prop])
        }
    }
    return element.style
}

function layout(element) {
    // 跳过没有样式计算属性的元素
    if (!element.computedStyle) {
        return
    }
    // 对style进行预处理
    let elementStyle = getStyle(element)
    // 此处只考虑flex布局
    if (elementStyle.display !== 'flex') {
        return
    }
    // 过滤掉文本节点
    let items = element.children.filter(e => e.type === "element")
    // 进行sort排序是为了支持flex中的order属性
    items.sort(function (a, b) {
        return (a.order || 0) - (b.order || 0)
    })

    let style = elementStyle
    // 对于width和height为auto或者为""统一置空
    ['width', 'height'].forEach(size => {
        if (style[size] === 'auto' || style[size] === '') {
            style[size] = null
        }
    })
    // 设置flex的属性的默认值
    if (!style.flexDirection || style.flexDirection === 'auto') {
        style.flexDirection = 'row'
    }
    if (!style.alignItems || style.alignItems === "auto") {
        style.alignItems = 'stretch'
    }
    if (!style.justifyContent || style.justifyContent === 'auto') {
        style.justifyContent = 'flex-start'
    }
    if (!style.flexWrap || style.flexWrap === 'auto') {
        style.flexWrap = 'nowrap'
    }
    if (!style.alignContent || style.alignContent === 'auto') {
        style.alignContent = 'stretch'
    }

    var mainSize, mainStart, mainEnd, mainSign, mainBase,
        crossSize, crossStart, crossEnd, crossSign, crossBase
    if (style.flexDirection === 'row') {
        mainSize = 'width'
        mainStart = 'left'
        mainEnd = 'right'
        mainSign = +1
        mainBase = 0

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    }
    if (style.flexDirection === 'row-reverse') {
        mainSize = 'width'
        mainStart = 'right'
        mainEnd = 'left'
        mainSign = -1
        mainBase = style.width

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    }
    if (style.flexDirection === 'column') {
        mainSize = 'height'
        mainStart = 'top'
        mainEnd = 'bottom'
        mainSign = +1
        mainBase = 0

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    }
    if (style.flexDirection === 'column-reverse') {
        mainSize = 'height'
        mainStart = 'bottom'
        mainEnd = 'top'
        mainSign = -1
        mainBase = style.height

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    }
    if (style.flexWrap === 'wrap-reverse') {
        let tmp = crossStart
        crossStart = crossEnd
        crossEnd = tmp
        crossSign = -1
    } else {
        crossBase = 0
        crossSign = 1
    }

    var isAutoMainSize = false
    // 如果父元素没有设置主轴尺寸就将所有子元素放到一行里
    if (!style[mainSize]) {
        elementStyle[mainSize] = 0
        for (let i = 0; i < items.length; i++) {
            let item = items[i]
            // 如果子元素的主轴尺寸不为null或者0时，主轴尺寸就等于所有子元素主轴尺寸之和
            if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== (void 0)) {
                elementStyle[mainSize] = elementStyle[mainSize] + itemStyle[mainSize]
            }
        }
        isAutoMainSize = true
    }
    // 定义一个数组用于装每一行的元素
    let flexLine = []
    // 定义flex布局数组用于装下所有行
    let flexLines = [flexLine]
    // 获取父元素的主轴尺寸大小
    let mainSpace = elementStyle[mainSize]
    // 定义交叉轴尺寸大小
    let crossSpace = 0
    // 循环遍历每一个元素
    for (let i = 0; i < items.length; i++) {
        let item = items[i]
        // 获取每一个元素的样式
        let itemStyle = getStyle(item)
        // 如果遍历的当前元素没有主轴尺寸就定义其主轴尺寸大小为0
        if (itemStyle[mainSize] === null) {
            itemStyle[mainSize] = 0
        }

        if (itemStyle.flex) {
            // 如果遍历的当前元素具有flex属性，就将当前元素加入到flex布局中的一行中
            flexLine.push(item)
        } else if (style.flexWrap === 'nowrap' && isAutoMainSize) {
            // 不需要换行的情况
            // 如果父元素具有nowrap属性并且排除了装一行的情况，每次遍历主轴尺寸减去当前元素主抽尺寸
            mainSpace -= itemStyle[mainSize]
            // 如果当前元素的交叉轴尺寸不为0就与之前的较差轴尺寸进行比较大小，获取最大的交叉轴尺寸
            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSize])
            }
            // 将该元素加入flex中的一行中
            flexLine.push(item)
        } else {
            // 需要换行的情况
            // 如果子元素的尺寸比父元素的尺寸大就将子元素的尺寸压缩到父元素尺寸
            if (itemStyle[mainSize] > style[mainSize]) {
                itemStyle[mainSize] = style[mainSize]
            }
            // 如果新加入子元素后，主轴尺寸没有比子所加入的子元素的主轴尺寸小，就需要换行了
            if (mainSpace < itemStyle[mainSize]) {
                // 首先是保留上一行遗留的信息包括主轴空间和交叉轴空间
                flexLine.mainSpace = mainSpace
                flexLine.crossSpace = crossSpace
                // 新加一行需要将没装下的元素加入到新行中
                flexLine = [item]
                // 将新行加入到flex布局数组中
                flexLines.push(flexLine)
                // 重置主轴尺寸和交叉轴尺寸
                mainSpace = style[mainSize]
                crossSpace = 0
            } else {
                // 当前元素能放入flex中的一行中就直接放入
                flexLine.push(item)
            }
            // 获取最大交叉轴的值
            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSize])
            }
            // 没变遍历一次主轴减一次当前元素的主轴尺寸
            mainSpace -= itemStyle[mainSize]
        }
    }
    flexLine.mainSpace = mainSpace
    console.log(items)

    if (style.flexWrap === 'nowrap' || isAutoMainSize) {
        flexLine.crossSpace = (style[crossSize] !== undefined) ? style[crossSize] : crossSpace
    } else {
        flexLine.crossSpace = crossSpace
    }

    if (mainSpace < 0) {

        let scale = style[mainSign] / (style[mainSize] - mainSpace)
        let currentMain = mainBase
        for (let i = 0; i < items.length; i++) {
            let item = items[i]
            let itemStyle = getStyle(item)

            if (itemStyle.flex) {
                itemStyle[mainSize] = 0
            }

            itemStyle[mainSize] = itemStyle[mainSize] * scale

            itemStyle[mainStart] = currentMain
            itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
            currentMain = itemStyle[mainEnd]
        }

    } else {

        flexLines.forEach(function (items) {

            let mainSpace = items.mainSpace
            let flexTotal = 0
            for (let i = 0; i < items.length; i++) {
                let item = items[i]
                let itemStyle = getStyle(item)
                if ((itemStyle.flex !== null) && (itemStyle.flex !== (void 0))) {
                    flexTotal += itemStyle.flex
                    continue
                }
            }

            if (flexTotal > 0) {

                let currentMain = mainBase
                for (let i = 0; i < items.length; i++) {
                    let item = items[i]
                    let itemStyle = getStyle(item)

                    if (itemStyle.flex) {
                        itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex
                    }
                    itemStyle[mainStart] = currentMain
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
                    currentMain = itemStyle[mainEnd]
                }
            } else {

                if (style.justifyContent === 'flex-start') {
                    let currentMain = mainBase
                    let step = 0
                }
                if (style.justifyContent === 'flex-end') {
                    let currentMain = mainSpace * mainSign + mainBase
                    let step = 0
                }
                if (style.justifyContent === 'center') {
                    let currentMain = mainSpace / 2 * mainSign + mainBase
                    let step = 0
                }
                if (style.justifyContent === 'space-between') {
                    let step = mainSpace / (items.length - 1) * mainSign
                    let currentMain = mainBase
                }
                if (style.justifyContent === 'space-around') {
                    let step = mainSpace / items.length * mainSign
                    let currentMain = step / 2 + mainBase
                }
                for (let i = 0; i < items.length; i++) {
                    let item = items[i]
                    itemStyle[mainStart] = currentMain
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
                    currentMain = itemStyle[mainSize] + step
                }
            }
        })
    }

    var crossSpace;
    if (!style[crossSize]) {
        crossSpace = 0;
        elementStyle[crossSize] = 0;
        for (var i = 0; i < flexLines.length; i++) {
            elementStyle[crossSize] = elementStyle[crossSize] + flexLines[i].crossSpace;
        }
    } else {
        crossSpace = style[crossSize];
        for (var i = 0; i < flexLines.length; i++) {
            crossSpace -= flexLines[i].crossSpace;
        }

        if (style.flexWrap === 'wrap-reverse') {
            crossBase = style[crossSize];
        } else {
            crossBase = 0;
        }
    }
    var lineSize = style[crossSize] / flexLines.length;

    var step;
    if (style.alignContent === 'flex-start') {
        crossBase += 0;
        step = 0;
    }
    if (style.alignContent === 'flex-end') {
        crossBase += crossSign * crossSpace;
        step = 0;
    }
    if (style.alignContent === 'center') {
        crossBase += crossSign * crossSpace / 2;
        step = 0;
    }
    if (style.alignContent === 'space-between') {
        crossBase += 0;
        step = crossSpace / (flexLines.length - 1);
    }
    if (style.alignContent === 'space-around') {
        step = crossSpace / (flexLines.length);
        crossBase += crossSign * step / 2;
    }
    if (style.alignContent === 'stretch') {
        crossBase += 0;
        step = 0;
    }

    flexLines.forEach(function (items) {
        var lineCrossSize = style.alignContent === 'stretch' ? items.crossSpace + crossSpace / flexLines.length : items.crossSpace;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var itemStyle = getStyle(item);
            var align = itemStyle.alignSelf || style.alignItems;
            if (itemStyle[crossSize] === null) {
                itemStyle[crossSize] = (align === 'stretch') ? lineCrossSize : 0;
            }
            if (align === 'flex-start') {
                itemStyle[crossStart] = crossBase;
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
            }
            if (align === 'flex-end') {
                itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
                itemStyle[crossStart] = itemStyle[crossEnd] + crossSign * itemStyle[crossSize];
            }
            if (align === 'center') {
                itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2;
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
            }
            if (align === 'stretch') {
                itemStyle[crossStart] = crossBase;
                itemStyle[crossEnd] = crossBase + crossSign * ((itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) ? itemStyle[crossSize] : lineCrossSize);
                itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);
            }
        }
        crossBase += crossSign * (lineCrossSize + step);
    });
    console.log(items);
}

module.exports = layout