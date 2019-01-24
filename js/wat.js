// Wega Auto Tetris On Canvas
// (c) 2013 Georgy 'Wega' Lomsadze (wega@hotbox.ru)


//////////////////////////////// Tools ////////////////////////////////

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0; 
}

function div2(x) {
    return Math.floor((Math.abs(x) / 2)) * sgn(x);
}

function getType(obj) {
      return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

// relMouseCoords() (c) Ryan Artecona http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
function relMouseCoords(event){
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return {x:canvasX, y:canvasY}
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

//////////////////////////////// Main class ////////////////////////////////

var WatGame = new Class({

    initialize: function(params) {

        var CELL_FORM_OUT_LEFT  = 1;
        var CELL_FORM_OUT_RIGHT = 2;
        var CELL_FORM_OUT_UP    = 4;
        var CELL_FORM_OUT_DOWN  = 8;
        
        var FIGURE_MAX_CELLS_LENGTH = 5;

        function getParam(paramName, defaultValue, toNumber) {
            var value = params[paramName];
            if (toNumber || (getType(defaultValue) == "number")) {
                value = parseInt(value);
                if (isNaN(value)) {
                    value = null;
                }
            }
            return value != null ? value : defaultValue; 
        }

        params = params || {};
        var fieldCols                  = getParam("fieldCols"                    , 10);
        var fieldRows                  = getParam("fieldRows"                    , 20);
        var cellWidth                  = getParam("cellSize"                     , 16);
        var cellHeight                 = getParam("cellSize"                     , 16);
        var gameAutoMode               = getParam("gameAutoMode"                 , true);
        var allowSwitchAutoMode        = getParam("allowSwitchAutoMode"          , true);
        var fieldCanvasID              = getParam("fieldCanvasID"                , "fieldCanvas");
        var nextFigureCanvasID         = getParam("nextFigureCanvasID"           , "nextFigureCanvas");
        var fieldBorderWidth           = getParam("fieldBorderWidth"             , 3);
        var fieldBorderManualModeColor = getParam("fieldBorderManualModeColor"   , "red");
        var fieldBorderAutoModeColor   = getParam("fieldBorderAutoModeColor"     , "darkgreen");
        var nextFigureBorderWidth      = getParam("nextFigureBorderWidth"        , 3);
        var nextFigureBorderColor      = getParam("nextFigureBorderColor"        , "#808000");
        var nextFigureBackgroundColor  = getParam("nextFigureBackgroundColor"    , "#000040");
        var fieldBackgroundColor       = getParam("fieldBackgroundColor"         , "#000040");
        var fieldLinesColor            = getParam("fieldLinesColor"              , "#000030");
        var gameCycleDelay             = getParam("gameCycleDelay"               , 50);
        var figureDownStepPercent      = getParam("figureDownStepPercent"        , 10);
        var figuresElmID               = getParam("figuresElmID"                 , "figures");
        var scoreElmID                 = getParam("scoreElmID"                   , "score");
        var delLinesCountElmID         = getParam("delLinesCountElmID"           , "delLines");
        var gameType                   = getParam("gameType"                     , 1);
        var fixedFigureNum             = getParam("fixedFigureNum"               , null, true);
        var nextFigures                = getParam("nextFigures"                  , null);
        var randomSeed                 = getParam("randomSeed"                   , null);
        var onGameOver                 = getParam("onGameOver"                   , null);
        var onChangeGameAutoMode       = getParam("onChangeGameAutoMode"         , null);
        var onNewFigure                = getParam("onNewFigure"                  , null); 
        var onDelLines                 = getParam("onDelLines"                   , null);
        var onMoveFigureDownOneRow     = getParam("onMoveFigureDownOneRow"       , null);
        var keyCodeRotateLeft          = getParam("keyCodeRotateLeft"            , 40);
        var keyCodeRotateRight         = getParam("keyCodeRotateRight"           , 38);
        var keyCodeMoveLeft            = getParam("keyCodeMoveLeft"              , 37);
        var keyCodeMoveRight           = getParam("keyCodeMoveRight"             , 39);
        var keyCodeFastDown            = getParam("keyCodeFastDown"              , 32);
        var keyCodeSwitchAutoMode      = getParam("keyCodeSwitchAutoMode"        , 13);
        var keyCodePause               = getParam("keyCodePause"                 , 27);

        if (randomSeed) {
            Math.seedrandom(randomSeed);
        } else {
            Math.seedrandom();
        }
        var randomRng = Math.random;

        //////////////////////////////// Cell ////////////////////////////////

        var Cell = new Class({    
            initialize: function(isFill, color, backgroundColor) {
                this.isFill = isFill || false;
                this.color = color || "#FFFFFF";
                this.backgroundColor = backgroundColor || "#000000";
                this.cellBorderOffset = 1;
            },
            
            draw: function(ctx, topLeftX, topLeftY) {
                if (this.isFill) {
                    ctx.lineWidth = 1;
                    ctx.fillStyle = this.backgroundColor;
                    ctx.fillRect(topLeftX, topLeftY, cellWidth, cellHeight);
                    ctx.fillStyle = this.color;
                    ctx.fillRect(topLeftX + this.cellBorderOffset, topLeftY + this.cellBorderOffset, cellWidth - this.cellBorderOffset * 2, cellHeight - this.cellBorderOffset * 2);
                    ctx.strokeStyle = this.backgroundColor;
                    ctx.strokeRect(topLeftX + this.cellBorderOffset + 2, topLeftY + this.cellBorderOffset + 2, cellWidth - this.cellBorderOffset * 2 - 4, cellHeight - this.cellBorderOffset * 2 - 4);
                }
            }

        });


        //////////////////////////////// CellForm ////////////////////////////////
        
        var CellForm = new Class({
            
            initialize: function(cols, rows, cellMatrix, color, backgroundColor) {
                this.cols = 0;
                this.rows = 0;
                this._cells = [];
                if (cellMatrix != null) {
                    this.initFromCellMatrix(cellMatrix, color, backgroundColor);
                } else if ((cols != null)  && (rows != null)) {
                    this.initNotFillCellForm(cols, rows, color, backgroundColor);
                }
            },

            initNotFillCellForm: function(cols, rows, color, backgroundColor) {
                this.cols = cols;
                this.rows = rows;
                this._cells = this._createNotFillCellMatrix(this.cols, this.rows, color, backgroundColor);    
            },

            initFromCellMatrix: function(cellMatrix, color, backgroundColor) {
                this.cols = cellMatrix[0].length;
                this.rows = cellMatrix.length;
                this._cells = this._createNotFillCellMatrix(this.cols, this.rows, color, backgroundColor);
                for (var r = 0; r < this.rows; r++) {
                    for (var c = 0; c < this.cols; c++) {
                        var cell = this.getCell(c, r);
                        cell.isFill = cellMatrix[r][c];
                    }
                }
            },

            _createNotFillCellMatrix: function(cols, rows, color, backgroundColor) {
                var resultMatrix = [];
                for (var r = 0; r < rows; r++) {
                    var line = [];
                    for (var c = 0; c < cols; c++) {
                        var cell = new Cell(false, color, backgroundColor);
                        line.push(cell);
                    }
                    resultMatrix.push(line);
                }
                return resultMatrix;
            },

            _createEmptyCellMatrix: function(cols, rows, color, backgroundColor) {
                var resultMatrix = [];
                for (var r = 0; r < rows; r++) {
                    var line = [];
                    for (var c = 0; c < cols; c++) {
                        line.push(null);
                    }
                    resultMatrix.push(line);
                }
                return resultMatrix;
            },

            getCell: function(col, row) {
                if ((col >= 0) && (col < this.cols)) {
                    if ((row >= 0) && (row <this.rows)) {
                        return this._cells[row][col];
                    }
                }
            },

            setCell: function(col, row, cell) {
                if ((col >= 0) && (col < this.cols)) {
                    if ((row >= 0) && (row <this.rows)) {
                        this._cells[row][col] = cell;
                        return true;
                    }
                }                
                return false;
            },

            xorCellIsFill: function(col, row) {
                var cell = this.getCell(col, row);
                cell.isFill = !cell.isFill;
                this.setCell(col, row, cell);
            },

            isFillOrNull: function(col, row) {
                if ((col >= 0) && (col < this.cols)) {
                    if ((row >= 0) && (row < this.rows)) {
                        return this._cells[row][col].isFill;                        
                    }
                }
                return true;                            
            },

            clear: function() {
                for (var r = 0; r < this.rows; r++) {
                    for (var c = 0; c < this.cols; c++) {
                        var cell = this.getCell(c, r);
                        cell.isFill = false;
                    }
                }                
            },

            getWidth: function() {
                return this.cols * cellWidth;
            },

            getHeight: function() {
                return this.rows * cellHeight;
            },

            rotateLeft: function() {
                var newCols = this.rows;
                var newRows = this.cols;
                var cells = this._createEmptyCellMatrix(newCols, newRows);
                for (var r = 0; r < newRows; r++) {
                    for (var c = 0; c < newCols; c++) {
                        cells[r][c] = this.getCell(this.cols - r - 1, c);
                    }
                }
                this._cells = cells;
                this.cols = newCols;
                this.rows = newRows;
            },

            rotateRight: function() {
                var newCols = this.rows;
                var newRows = this.cols;
                var cells = this._createEmptyCellMatrix(newCols, newRows);
                for (var r = 0; r < newRows; r++) {
                    for (var c = 0; c < newCols; c++) {
                        cells[r][c] = this.getCell(r, this.rows - c - 1);
                    }
                }
                this._cells = cells;
                this.cols = newCols;
                this.rows = newRows;
            },

            putOver: function(cellForm, col, row, xor) {
                xor = xor || false;
                var isOutLine = false;
                for (var r = 0; r < cellForm.rows; r++) {
                    for (var c = 0; c < cellForm.cols; c++) {
                        var cell = cellForm.getCell(c, r);
                        if (cell != null && cell.isFill) {
                            if (!xor) {
                                isOutLine = isOutLine || !this.setCell(c + col, r + row, cell);
                            } else {
                                var thisCell = this.getCell(c + col, r + row);
                                if (thisCell != null) {
                                    if (!thisCell.isFill) {
                                        this.setCell(c + col, r + row, cell);
                                    } else {
                                        var newCell = new Cell();
                                        this.setCell(c + col, r + row, newCell);
                                    }
                                } else {
                                    isOutLine = true;
                                }
                            }
                        }
                    }
                }
                return isOutLine;
            },

            isCollidet: function(cellForm, col, row) {
                for (var r = 0; r < cellForm.rows; r++) {
                    for (var c = 0; c < cellForm.cols; c++) {
                        var cell = cellForm.getCell(c, r);
                        if (cell.isFill) {
                            var cell2 = this.getCell(c + col, r + row);
                            if (cell2 != null && cell2.isFill) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            },

            isFreeMoveDownForFigure: function(col, row, cols, delLines) {
                if (delLines == null) delLines = [];
                for (var r = row; r >= 0; r--) {
                    if (!delLines[r]) {
                        for (var c = col; c < col + cols; c++) {
                            if (this.isFillOrNull(c, r)) {
                                return false;
                            }
                        }
                    }
                }
                return true;                
            },

            getOutlines: function(cellForm, col, row) {
                var result = 0;
                for (var r = 0; r < cellForm.rows; r++) {
                    for (var c = 0; c < cellForm.cols; c++) {
                        var cell = cellForm.getCell(c, r);
                        if (cell.isFill) {
                            if (c + col < 0) {
                                result = result | CELL_FORM_OUT_LEFT;
                            }
                            if (c + col >= this.cols) {
                                result = result | CELL_FORM_OUT_RIGHT;
                            }
                            if (r + row < 0) {
                                result = result | CELL_FORM_OUT_UP;
                            }
                            if (r + row >= this.rows) {
                                result = result | CELL_FORM_OUT_DOWN;
                            }
                        }
                    }
                }
                return result;
            },

            draw: function(ctx, topLeftX, topLeftY) {
                topLeftX = topLeftX || 0;
                topLeftY = topLeftY || 0;
                for (var r = 0; r < this.rows; r++) {
                    for (var c = 0; c < this.cols; c++) {
                        var cell = this.getCell(c, r);
                        var x = topLeftX + cellWidth * c;
                        var y = topLeftY + cellHeight * r;
                        cell.draw(ctx, x, y); 
                    }
                }
            }


        });


        //////////////////////////////// Figure ////////////////////////////////

        var Figure = new Class({

            Implements: CellForm,

            initialize: function(formNum, color, backgroundColor) {
                if (formNum == null) {
                    if (nextFigures && getType(nextFigures) == "string") {
                        formNum = parseInt(nextFigures[0], 13);
                        if (isNaN(formNum)) {
                            formNum = null;
                        }
                        nextFigures = nextFigures.substring(1);
                    }
                    if (formNum == null) {
                        if (fixedFigureNum == null || fixedFigureNum === "") {
                            Math.random = randomRng;
                            if (gameType == 2)
                                formNum = getRandomInt(0, 11);
                            else if (gameType == 3)
                                formNum = getRandomInt(0, 13);
                            else
                                formNum = getRandomInt(0, 6);
                            randomRng = Math.random;
                        } else {
                            formNum = fixedFigureNum;
                        }
                    }
                }
                var cellMatrix;
                // Warning: при расчете оптимальной стратегии размещения фигуры учитываются
                //          номера форм, так что изменять их только злесь не рекомендуется!
                if (formNum == 0) {
                    if (color == null) color = "#00FF00";
                    cellMatrix = [[1, 2], [3, 4]];
                } else if (formNum == 1) {
                    if (color == null) color = "#0000FF";
                    cellMatrix = [[0, 0, 0], [1, 1, 1], [1, 0, 0]];
                } else if (formNum == 2) {
                    if (color == null) color = "#FF00FF";
                    cellMatrix = [[1, 0, 0], [1, 1, 1], [0, 0, 0]];
                } else if (formNum == 3) {
                    if (color == null) color = "#FFFF00";
                    cellMatrix = [[1, 1, 0], [0, 1, 1]];
                } else if (formNum == 4) {
                    if (color == null) color = "#00FFFF";
                    cellMatrix = [[0, 1, 1], [1, 1, 0]];
                } else if (formNum == 5) {
                    if (color == null) color = "#FFFFFF";
                    cellMatrix = [[0, 0, 0], [1, 1, 1], [0, 1, 0]];
                } else if (formNum == 6) {
                    if (color == null) color = "#FF0000";
                    cellMatrix = [[1, 1, 1, 1]];
                } else if (formNum == 7) {
                    if (color == null) color = "#800000";
                    cellMatrix = [[1, 1, 1], [1, 1, 0]];
                } else if (formNum == 8) {
                    if (color == null) color = "#808000";
                    cellMatrix = [[1, 1, 0], [1, 1, 1]];
                } else if (formNum == 9) {
                    if (color == null) color = "#008080";
                    cellMatrix = [[1, 1, 1]];
                } else if (formNum == 10) {
                    if (color == null) color = "#800080";
                    cellMatrix = [[1, 1, 1], [1, 0, 1]];
                } else if (formNum == 11) {
                    if (color == null) color = "#008000";
                    cellMatrix = [[1, 1]];
                } else if (formNum == 12) {
                    if (color == null) color = "#000080";
                    cellMatrix = [[1, 1, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 1, 1]];
                } else if (formNum == 13) {
                    if (color == null) color = "#808080";
                    cellMatrix = [[0, 0, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [1, 1, 1, 0, 0]];
                }
                this.initFromCellMatrix(cellMatrix, color, backgroundColor);
                this._formNum = formNum;
            },

            getFormNum: function() {
                return this._formNum;
            }

        });


        //////////////////////////////// Field ////////////////////////////////
        
        var Field = new Class({

            Implements: CellForm,

            initialize: function(cols, rows, cellMatrix) {
                this._isGameOver = false;
                this.delLinesCount = 0;
                this.score = 0;
                this.figuresCount = 0;
                this.figureFastDownMode = false;
                this._figure = null;
                this._figureCol = null;
                this._figureRow = null;
                this._figureUpPerc = null;
                this._autoMode = gameAutoMode;
                this._autoFindCombination = true;
                this._autoBestCol = null;
                this._autoRotateCount = null;
                if (cellMatrix != null) {
                    this.initFromCellMatrix(cellMatrix);
                } else if ((cols != null)  && (rows != null)) {
                    this.initNotFillCellForm(cols, rows);
                }
                this._fieldDrawBuffer = document.createElement('canvas');
                this._fieldDrawBuffer.width = this.getWidth();
                this._fieldDrawBuffer.height = this.getHeight();
                this.updateFieldDrawBuffer();
                this.nextFigure = new Figure();
                this._newFigure();
            },

            _newFigure: function() {
                this.figuresCount++;
                var nextFigureCol = Math.floor((this.cols - this.nextFigure.cols) / 2);
                var nextFigureRow = 1 - this.nextFigure.rows;
                this._figure = this.nextFigure;
                this._figureCol = nextFigureCol;
                this._figureRow = nextFigureRow;
                this._figureUpPerc = 100;
                this.figureFastDownMode = false;
                this.nextFigure = new Figure();
                this._autoFindCombination = true;
                if (onNewFigure)
                    onNewFigure(this._figure.getFormNum());
            },

            restart: function() {
                this.clear();
                this._newFigure();
                this.score = 0;
                this.delLinesCount = 0;
                this.updateFieldDrawBuffer();
                this._isGameOver = false;
            },

            figureMoveLeft: function() {
                var newCol = this._figureCol - 1;
                var newRow = this._figureRow;
                if (!this.isCollidet(this._figure, newCol, newRow) && !(this.getOutlines(this._figure, newCol, newRow) & CELL_FORM_OUT_LEFT)) {
                  this._figureCol = newCol;
                  this._figureRow = newRow;
                  return true;
                } else
                  return false;
            },

            figureMoveRight: function() {
                var newCol = this._figureCol + 1;
                var newRow = this._figureRow;
                if (!this.isCollidet(this._figure, newCol, newRow) && !(this.getOutlines(this._figure, newCol, newRow) & CELL_FORM_OUT_RIGHT)) {
                  this._figureCol = newCol;
                  this._figureRow = newRow;
                  return true;
                } else
                  return false;
            },

            figureMoveUp: function() {
                var newCol = this._figureCol;
                var newRow = this._figureRow - 1;
                if (!this.isCollidet(this._figure, newCol, newRow) && !(this.getOutlines(this._figure, newCol, newRow) & CELL_FORM_OUT_UP)) {
                  this._figureCol = newCol;
                  this._figureRow = newRow;
                  return true;
                } else
                  return false;
            },

            figureMoveDown: function() {
                var newCol = this._figureCol;
                var newRow = this._figureRow + 1;
                if (!this.isCollidet(this._figure, newCol, newRow) && !(this.getOutlines(this._figure, newCol, newRow) & CELL_FORM_OUT_DOWN)) {
                  this._figureCol = newCol;
                  this._figureRow = newRow;
                  return true;
                } else
                  return false;
            },

            setFigureFastDownMode: function() {
                this.figureFastDownMode = true;
            },

            _delLines: function() {
                var delLines = 0;
                for (var r = 0; r < this.rows; r++) {
                    var delLine = true;
                    for (var c = 0; c < this.cols; c++) {
                        var cell = this.getCell(c, r);
                        if (!cell.isFill)
                            delLine = false;
                    }
                    if (delLine) {
                        delLines++;
                        for (var r2 = r - 1; r2 >= 0; r2--) {
                            for (var c2 = 0; c2 < this.cols; c2++) {
                                var cell = this.getCell(c2, r2);
                                this.setCell(c2, r2 + 1, cell);
                            }
                        }
                        for (var c2 = 0; c2 < this.cols; c2++) {
                            var cell = new Cell();
                            this.setCell(c2, 0, cell);
                        }
                    }
                }
                switch (delLines) {
                    case 1: this.score += 100;
                        break;
                    case 2: this.score += 300;
                        break;
                    case 3: this.score += 500;
                        break;
                    case 4: this.score += 800;
                        break;
                }
                if (delLines > 0 && onDelLines)
                    onDelLines(delLines);
                this.delLinesCount += delLines;
                return delLines;
            },

            figureAutoDown: function(stepPerc) {
                if (this._isGameOver)
                    return false;
                stepPerc = stepPerc || 100;
                if (this._autoMode) {
                    if (this._autoFindCombination) {
                        this._auto_setBestCombination();
                        this._autoFindCombination = false;
                    }
                }
                if (this._autoRotateCount != null) {
                    if (this._autoRotateCount > 0) {
                        this._autoRotateCount--;
                        this.figureRotateLeft();
                    } else if (this._figureCol > this._autoBestCol) {
                        this.figureMoveLeft();
                    } else if (this._figureCol < this._autoBestCol) {
                        this.figureMoveRight();
                    } else {
                        this.setFigureFastDownMode()
                        this._autoRotateCount = null;
                    }
                    /*
                    while (this._autoRotateCount > 0) {
                        this._autoRotateCount--;
                        this.figureRotateLeft();
                    }
                    while (this._figureCol > this._autoBestCol && this.figureMoveLeft()) { }
                    while (this._figureCol < this._autoBestCol && this.figureMoveRight()) { }
                    this.setFigureFastDownMode();
                    this._autoRotateCount = null;
                    */
                }
                this._figureUpPerc -= stepPerc;
                if ((this._figureUpPerc <= 0) || this.figureFastDownMode) {                    
                    if (this.figureFastDownMode) {
                        this._figureUpPerc = 100;
                        this.score += 2;
                    } else {
                        this._figureUpPerc += 100;
                        this.score += 1;
                    }
                    this._figureRow = this._figureRow + 1;
                    if (onMoveFigureDownOneRow)
                        onMoveFigureDownOneRow(this._figureRow);
                    var isCollidet = this.isCollidet(this._figure, this._figureCol, this._figureRow);
                    var outLines = this.getOutlines(this._figure, this._figureCol, this._figureRow);
                    if (isCollidet || (outLines & CELL_FORM_OUT_DOWN)) {                        
                        var isOutLine = this.putOver(this._figure, this._figureCol, this._figureRow - 1);
                        if (isOutLine) {
                            this.updateFieldDrawBuffer();
                            this._isGameOver = true;
                            if (onGameOver != null) {
                                onGameOver();
                            } else {
                                this.restart();
                            }
                            return true;
                        } else {                            
                            this._delLines();
                            this.updateFieldDrawBuffer();
                            this._newFigure();
                            return true;
                        }
                    }                    
                }
                return false;
            },

            _figureRotate: function(left) {
                var cols = this._figure.cols;
                var rows = this._figure.rows;
                if (left) {
                    this._figure.rotateLeft();
                } else {
                    this._figure.rotateRight();
                }
                var colAdd = div2(cols - this._figure.cols);
                var rowAdd = div2(rows - this._figure.rows);
                var newCol = this._figureCol + colAdd;
                var newRow = this._figureRow + rowAdd;
                while (this.getOutlines(this._figure, newCol, newRow) & CELL_FORM_OUT_LEFT) {
                  newCol++;
                }
                while (this.getOutlines(this._figure, newCol, newRow) & CELL_FORM_OUT_RIGHT) {
                  newCol--;
                }
                if (this.isCollidet(this._figure, newCol, newRow) || (this.getOutlines(this._figure, newCol, newRow) & CELL_FORM_OUT_DOWN)) {
                    if (left) {
                        this._figure.rotateRight();
                    } else {
                        this._figure.rotateLeft();
                    }
                    return false;
                } else {
                    this._figureCol = newCol;
                    this._figureRow = newRow;
                    return true
                }
            },

            figureRotateLeft: function() {
                return this._figureRotate(true);
            },

            figureRotateRight: function() {
                return this._figureRotate(false);
            },

            updateFieldDrawBuffer: function() {
                var ctx = this._fieldDrawBuffer.getContext("2d");
                ctx.lineWidth = 1;
                ctx.fillStyle = fieldBackgroundColor;
                ctx.fillRect(0, 0, this.getWidth(), this.getHeight());
                for (var r = 0; r < this.rows; r++) {
                    for (var c = 0; c < this.cols; c++) {
                        var x = c * cellWidth;
                        var y = r * cellHeight;
                        ctx.strokeStyle = fieldLinesColor;
                        ctx.strokeRect(x, y, cellWidth, cellHeight);
                    }
                }
                this.draw(ctx);
            },

            drawAll: function(ctx, topLeftX, topLeftY) {
                topLeftX = topLeftX || 0;
                topLeftY = topLeftY || 0;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(topLeftX, topLeftY);
                ctx.lineTo(this.getWidth() + topLeftX, topLeftY);
                ctx.lineTo(this.getWidth() + topLeftX, this.getHeight() + topLeftY);
                ctx.lineTo(topLeftX, this.getHeight() + topLeftY);
                ctx.clip();
                ctx.drawImage(this._fieldDrawBuffer, topLeftX, topLeftY);
                var x = this._figureCol * cellWidth  + topLeftX;
                var y = this._figureRow * cellHeight + topLeftY - (this._figureUpPerc * cellHeight / 100);
                this._figure.draw(ctx, x, y);
                ctx.restore();
            },

            switchAutoMode: function() {
                this._autoMode = ! this._autoMode;
                this.setAutoFindCombination();                
                if (onChangeGameAutoMode)
                    onChangeGameAutoMode(this._autoMode);
            },

            setAutoFindCombination: function() {
                this._autoFindCombination = true;
                this.figureFastDownMode = false;
            },

            getIsAutoMode: function() {
                return this._autoMode;
            },

            _auto_getScore: function(cellForm, col, row) {
                var score = 0;
                var fieldCols = this.cols;
                var fieldRows = this.rows;
                var figureCols = cellForm.cols;
                var figureRows = cellForm.rows;
                var nextFigureFormNum = this.nextFigure.getFormNum();
                var allFigureInDelRows = true;
                var delLinesInField = [];
                var delLinesCount = 0;
                for (var r = 0; r < figureRows; r++) {                    
                    var figureRowHasFilledCell = false; // В этой строке у фигуры есть хотя бы один элемент
                    for (var c = 0; c < figureCols; c++) {
                        var figureCell = cellForm.getCell(c, r);
                        if (figureCell.isFill) {
                            figureRowHasFilledCell = true;                            
                            // Бонус за прилегание к другим фигурам и полю
                            for (var cc = -1; cc <= 1; cc++) {
                                for (var rr = -1; rr <= 1; rr++) {
                                    if (cc == 0 || rr == 0) {
                                        figureCell = cellForm.getCell(c + cc, r + rr);
                                        if (figureCell == null || !figureCell.isFill) {
                                            var fieldCell = this.getCell(c + col + cc, r + row + rr);
                                            if (fieldCell == null) {
                                                score += 8;
                                            } else if (fieldCell.isFill) {
                                                score += 10;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (figureRowHasFilledCell) {
                        // Бонус за заполненную (удаляемую) строку
                        var delLine = true;
                        for (var c = 0; c < fieldCols; c++) {
                            var figureCell = cellForm.getCell(c - col, r);
                            var fieldCell = this.getCell(c, r + row);
                            if (fieldCell == null || !fieldCell.isFill) {
                                if (figureCell == null || !figureCell.isFill) {
                                    delLine = false;
                                    allFigureInDelRows = false;
                                }
                            }
                        }
                        if (delLine) {
                            delLinesInField[r + row] = true;
                            score += Math.floor(r / this.rows * 25);
                            delLinesCount++;
                        }
                    }
                }
                // Бонусы за формы
                this.putOver(cellForm, col, row, true);
                var bonusFormType1 = false;
                var bonusFormType2 = false;
                var bonusFormType3 = false;
                var bonusFormType4 = false;
                var bonusFormType5 = false;
                var bonusFormType6 = false;
                var bonusFormType7 = false;
                var bonusFormType8 = false;
                var bonusFormType9 = false;
                var bonusFormType10 = false;
                var bonusFormType11 = false;
                var bonusFormType12 = false;
                var longHolesCount = 0;
                
                var filled = [];
                for (var c = -1 - 1; c < fieldCols + 1 + 5; c++) {
                    filled[c] = []; 
                    for (var r = 0 - 1; r < fieldRows + 1 + 3; r++) {
                        filled[c][r] = this.isFillOrNull(c, r);
                    }
                }

                var skipColForHoleSearch = [];
                for (var c = -1; c < fieldCols + 1; c++) {
                    for (var r = 0; r < fieldRows; r++) {
                        // Бонус за форму:
                        //  ?..?
                        //  X..X
                        //   XX
                        if (!bonusFormType1) {
                            if (!filled[c][r] || !filled[c+3][r]) {
                                if (!filled[c+1][r] && !filled[c+2][r]) {
                                    if (filled[c][r+1] && filled[c+3][r+1]) {
                                        if (!filled[c+1][r+1] && !filled[c+2][r+1]) {
                                            if (filled[c+1][r+2] && filled[c+2][r+2]) {                                                
                                                score += 5;
                                                bonusFormType1 = true;
                                            }    
                                        }
                                    }
                                }
                            }
                        }
                        // Бонус за форму:
                        // ...
                        // X.X
                        //  X
                        if (!bonusFormType2) {
                            if (!filled[c][r] && !filled[c+1][r] && !filled[c+2][r]) {
                                if (filled[c][r+1] && !filled[c+1][r+1] && filled[c+2][r+1]) {
                                    if (filled[c+1][r+2]) {
                                        score += 5;
                                        bonusFormType2 = true;
                                    }
                                }
                            }
                        }
                        // Бонусы с учетом следующей фигуры:                        
                        // Если следующая фигура:
                        //  XX
                        //  XX
                        if (nextFigureFormNum == 0) {
                            // X..X
                            // X..X
                            //  XX
                            if (!bonusFormType3) {
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r] && filled[c+3][r]) {
                                    if (filled[c][r+1] && !filled[c+1][r+1] && !filled[c+2][r+1] && filled[c+3][r+1]) {
                                        if (filled[c+1][r+2] && filled[c+2][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 2, delLinesInField)) {
                                                score += 5;
                                                bonusFormType3 = true;
                                            }
                                        }
                                    }
                                }
                            }
                            // X..X
                            //  XX
                            if (!bonusFormType4) {
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r] && filled[c+3][r]) {
                                    if (filled[c+1][r+1] && filled[c+2][r+1]) {
                                        if (this.isFreeMoveDownForFigure(c+1, r-1, 2, delLinesInField)) {
                                            score += 5;
                                            bonusFormType4 = true;                                            
                                        }
                                    }
                                }                         
                            }
                        }
                        // Если следующая фигура
                        //  XXXX
                        //  X
                        if (nextFigureFormNum == 1) {
                            if (!bonusFormType5) {
                                // .. 
                                // X.X
                                // X.X
                                if (!filled[c][r] && !filled[c+1][r]) {
                                    if (filled[c][r+1] && !filled[c+1][r+1] && filled[c+2][r+1]) {
                                        if (filled[c][r+2] && !filled[c+1][r+2] && filled[c+2][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c, r-1, 2, delLinesInField)) {
                                                score += 10;
                                                bonusFormType5 = true;                                                
                                            }
                                        }
                                    }
                                }
                                //  ...
                                // X.XX
                                //  X
                                if (!filled[c+1][r] && !filled[c+2][r] && !filled[c+3][r]) {
                                    if (filled[c][r+1] && !filled[c+1][r+1] && filled[c+2][r+1] && filled[c+3][r+1]) {
                                        if (filled[c+1][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 3, delLinesInField)) {
                                                score += 10;
                                                bonusFormType5 = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // Если следующая фигура
                        // XXXX
                        //    X
                        if (nextFigureFormNum == 2) {
                            if (!bonusFormType6) {
                                //  ..
                                // X.X
                                // X.X
                                if (!filled[c+1][r] && !filled[c+2][r]) {
                                    if (filled[c][r+1] && !filled[c+1][r+1] && filled[c+2][r+1]) {
                                        if (filled[c][r+2] && !filled[c+1][r+2] && filled[c+2][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 2, delLinesInField)) {
                                                score += 10;
                                                bonusFormType6 = true;
                                            }
                                        }
                                    }
                                }
                                // ...
                                // XX.X
                                //   X
                                if (!filled[c][r] && !filled[c+1][r] && !filled[c+2][r]) {
                                    if (filled[c][r+1] && filled[c+1][r+1] && !filled[c+2][r+1] && filled[c+3][r+1]) {
                                        if (filled[c+2][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c, r-1, 3, delLinesInField)) {
                                                score += 10;
                                                bonusFormType6 = true;
                                            }
                                        }
                                    }                                    
                                }
                            }
                        }
                        // Если следующая фигура
                        // XX
                        //  XX
                        if (nextFigureFormNum == 3) {                            
                            if (!bonusFormType7) {                                
                                // X..
                                //  XX                                
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r]) {
                                    if (filled[c+1][r+1] && filled[c+2][r+1]) {
                                        if (this.isFreeMoveDownForFigure(c, r-1, 3, delLinesInField)) {
                                            score += 10;
                                            bonusFormType7 = true;
                                        }
                                    }
                                }
                                // ..X
                                // .X
                                // X
                                if (!filled[c][r] && !filled[c+1][r] && filled[c+2][r]) {
                                    if (!filled[c][r+1] && filled[c+1][r+1]) {
                                        if (filled[c][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c, r-1, 2, delLinesInField)) {
                                                score += 10;
                                                bonusFormType7 = true;
                                            }
                                        }
                                    }                                
                                }
                            }
                        }
                        // Если следующая фигура
                        //  XX
                        // XX
                        if (nextFigureFormNum == 4) {
                            if (!bonusFormType8) {
                                // ..X
                                // XX
                                if (!filled[c][r] && !filled[c+1][r] && filled[c+2][r]) {
                                    if (filled[c][r+1] && filled[c+1][r+1]) {
                                        if (this.isFreeMoveDownForFigure(c, r-1, 3, delLinesInField)) {
                                            score += 10;
                                            bonusFormType8 = true;                                            
                                        }
                                    }
                                }
                                // X..
                                //  X.
                                //   X
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r]) {
                                    if (filled[c+1][r+1] && !filled[c+2][r+1]) {
                                        if (filled[c+2][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 2, delLinesInField)) {
                                                score += 10;
                                                bonusFormType8 = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // Если следующая фигура
                        //  XXX                        
                        //   X
                        if (nextFigureFormNum == 5) {
                            if (!bonusFormType9) {
                                // X..X
                                // X.X
                                //  X
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r] && filled[c+3][r]) {
                                    if (filled[c][r+1] && !filled[c+1][r+1] && filled[c+2][r+1]) {
                                        if (filled[c+1][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 2, delLinesInField)) {
                                                score += 10;
                                                bonusFormType9 = true;
                                            }
                                        }                                            
                                    }                                        
                                }
                                // X..X
                                //  X.X
                                //   X
                                if (filled[c][r] && !filled[c+1][r] && filled[c+2][r] && filled[c+3][r]) {
                                    if (filled[c+1][r+1] && !filled[c+2][r+1] && filled[c+3][r+1]) {
                                        if (filled[c+2][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 2, delLinesInField)) {
                                                score += 10;
                                                bonusFormType9 = true;
                                            }
                                        }
                                    }
                                } 
                                // X...X
                                //  X.X
                                //   X
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r] && !filled[c+3][r] && filled[c+4][r]) {
                                    if (filled[c+1][r+1] && !filled[c+2][r+1] && filled[c+3][r+1]) {
                                        if (filled[c+2][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 3, delLinesInField)) {
                                                score += 10;
                                                bonusFormType9 = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // Если следующая фигура
                        // XXX
                        // XX
                        if (!bonusFormType10) {
                            if (nextFigureFormNum == 7) {
                                // ..X
                                // XX
                                if (!filled[c][r] && !filled[c+1][r] && filled[c+2][r]) {
                                    if (filled[c][r+1] && filled[c+1][r+1]) {
                                        if (this.isFreeMoveDownForFigure(c, r-1, 3, delLinesInField)) {
                                            score += 10;
                                            bonusFormType10 = true;                                            
                                        }
                                    }
                                }
                                // X..X
                                //  X.X
                                //   X
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r] && filled[c+3][r]) {
                                    if (filled[c+1][r+1] && !filled[c+2][r+1] && filled[c+3][r+1]) {
                                        if (filled[c+2][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 2, delLinesInField)) {                                            
                                                score += 10;
                                                bonusFormType10 = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // Если следующая фигура
                        // XX
                        // XXX
                        if (!bonusFormType11) {
                            if (nextFigureFormNum == 8) {
                                // X..
                                //  XX
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r]) {
                                    if (filled[c+1][r+1] && filled[c+2][r+1]) {
                                        if (this.isFreeMoveDownForFigure(c, r-1, 3, delLinesInField)) {
                                            score += 10;
                                            bonusFormType11 = true;
                                        }
                                    }
                                }
                                // X..X
                                // X.X
                                //  X
                                if (filled[c][r] && !filled[c+1][r] && !filled[c+2][r] && filled[c+3][r]) {
                                    if (filled[c][r+1] && !filled[c+1][r+1] && filled[c+2][r+1]) {
                                        if (filled[c+1][r+2]) {
                                            if (this.isFreeMoveDownForFigure(c+1, r-1, 2, delLinesInField)) {
                                               score += 10;
                                               bonusFormType11 = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // Если следующая фигура
                        // XXX
                        // X X
                        if (!bonusFormType12) {
                            if (nextFigureFormNum == 10) {
                                // .X.
                                if (!filled[c][r] && filled[c+1][r] && !filled[c+2][r]) {
                                    if (this.isFreeMoveDownForFigure(c, r-1, 3, delLinesInField)) {
                                        score += 10;
                                        bonusFormType12 = true;
                                    }
                                }
                            }
                        }
                        // Штраф за длинные ямы с "горлышком" толщиной в один элемент
                        if (!skipColForHoleSearch[c]) {
                            if (filled[c][r] && !filled[c+1][r] && filled[c+2][r]) {
                                var holeSize = 1;
                                var step = 1;
                                while (delLinesInField[r+step] || !filled[c+1][r+step]) {                                    
                                    if (!delLinesInField[r+step]) {
                                        holeSize ++;
                                    }
                                    step ++;
                                }
                                if (holeSize == 2) {
                                    score -= 10;
                                }
                                if (holeSize >= 3) {
                                    longHolesCount++;
                                    score -= holeSize * (longHolesCount - (nextFigureFormNum == 6 || nextFigureFormNum == 9 ? 1 : 0)) * 25 + 10;
                                }
                                skipColForHoleSearch[c] = true;
                            }
                        }
                        // Штраф за надвисание над пустыми ячейками                        
                        if (r < fieldRows - 1 && !delLinesInField[r]) {
                            if (filled[c][r]) {                                    
                                var holeSize = 0;
                                var step = 1;
                                while (delLinesInField[r+step] || !filled[c][r+step]) {                                        
                                    if (!delLinesInField[r+step]) {
                                        holeSize ++;
                                    }
                                    step ++;
                                }
                                if (holeSize > 0) {
                                   score -= holeSize * 15 + Math.floor((1 - r / fieldRows) * 90);
                                   var fillUpSize = 0;
                                   var step = 1;
                                   while (filled[c][r-step] && r-step > 0) {
                                     if (!delLinesInField[r-step]) {
                                        fillUpSize++;
                                     }
                                     step++;
                                   }
                                   score -= fillUpSize * 15;
                                }
                            }
                        }
                    }
                }                                
                this.putOver(cellForm, col, row, true);
                // Штраф если фигура находится над пустыми ячейками
                for (var c = 0; c < figureCols; c++) {
                    var figureColHasFilledCell = false; // В этой колонке у фигуры есть хотя бы один элемент
                    for (var r = 0; r < figureRows; r++) {                    
                        var figureCell = cellForm.getCell(c, r);
                        if (figureCell.isFill) {
                            figureHasFilledCell = true;
                        }
                    }
                    var r = row + figureRows + 1;
                    while (r < fieldRows) {
                        if (!this.isFillOrNull(c + col, r)) {
                            score -= 5;
                            r = fieldRows;
                        }
                        r++;
                    }
                }
                
                // Бонус если вся фигура попадает в удаляемые строки
                if (allFigureInDelRows) {
                    // К горизонтальной палке это не относится! Ибо её по возможности выгоднее ставить вертикально.
                    if (figureCols != 4 || figureRows != 1) {
                        score += 1000;
                    }
                }
                                
                // Чем ниже, тем лучше
                score += row * 5;
                
                // Бонус за вертикальное размещение палки
                if (figureCols == 1 && figureRows == 4) {
                    score += 10;
                }

                // Если фигура встала слишком высоко и линии при этом не удаляются, то дополнительный штраф
                if (delLinesCount == 0 && row / fieldRows <= 0.25) {
                    score -= (1 - row / fieldRows) * 50;
                }

                return score;
            },

            _auto_setBestCombination: function() {
                var figureColSave = this._figureCol;
                var figureRowSave = this._figureRow;
                var bestScore = null;
                var bestCol = null;
                var bestRow = null;
                var bestRotateCount = null
                var formNum = this._figure.getFormNum();
                if (formNum == 0) {
                    rotateCountMax = 1;
                } else if (formNum == 3 || formNum == 4 || formNum == 6) {
                    rotateCountMax = 2;
                } else {
                    rotateCountMax = 4;
                }
                for (var rotateCount = 0; rotateCount < rotateCountMax; rotateCount++) {
                    this.figureRotateLeft();
                    var figureRowSave2 = this._figureRow;
                    while (this.figureMoveLeft()) { }
                    moveRight = true;
                    while (moveRight) {
                        while (this.figureMoveDown()) { }
                        var col = this._figureCol;
                        var row = this._figureRow;
                        var outLines = this.getOutlines(this._figure, col, row);
                        if (!outLines) {                            
                            var score = this._auto_getScore(this._figure, col, row);
                            if (bestScore == null || score > bestScore || (score == bestScore && row > bestRow)) {
                                bestScore = score;
                                bestCol = col;
                                bestRow = row;
                                bestRotateCount = rotateCount + 1;
                                if (bestRotateCount == rotateCountMax) {
                                    bestRotateCount = 0;
                                }
                            }
                        }
                        this._figureRow = figureRowSave2;
                        moveRight = this.figureMoveRight();
                    }
                }
                this._figureCol = figureColSave;
                this._figureRow = figureRowSave;
                if (bestScore != null) {
                    this._autoRotateCount = bestRotateCount;
                    this._autoBestCol = bestCol;
                } else {
                    this._autoRotateCount = null;
                }
                
            }

        });


        var field = new Field(fieldCols, fieldRows);

        var drawNextFigure = function() {
            if (nextFigureCanvas) {
                nextFigureCtx.fillStyle = nextFigureBackgroundColor;
                nextFigureCtx.fillRect(0, 0, nextFigureCanvas.width, nextFigureCanvas.height);
                nextFigureCtx.strokeStyle = nextFigureBorderColor;
                nextFigureCtx.lineWidth = nextFigureBorderWidth * 2;
                nextFigureCtx.strokeRect(0, 0, nextFigureCanvas.width, nextFigureCanvas.height);
                var x = (nextFigureCanvas.width - field.nextFigure.getWidth()) / 2;
                var y = (nextFigureCanvas.height - field.nextFigure.getHeight()) / 2; 
                field.nextFigure.draw(nextFigureCtx, x, y);
            }
        };

        var drawField = function() {
            if (fieldCanvas) {
                field.drawAll(fieldCtx, fieldBorderWidth, fieldBorderWidth);
            }
        };

        var drawFieldFrameMode = function() {
            if (fieldCanvas) {
                fieldCtx.strokeStyle = field.getIsAutoMode() ? fieldBorderAutoModeColor : fieldBorderManualModeColor;
                fieldCtx.lineWidth = fieldBorderWidth * 2;
                fieldCtx.strokeRect(0, 0, fieldCanvas.width, fieldCanvas.height);
            }
        }

        this.xorCellOnFieldCanvasClick = function(event) {
            var click = fieldCanvas.relMouseCoords(event);
            if ((click.x >= fieldBorderWidth) && (click.x < fieldCanvas.width - fieldBorderWidth)) {
                if ((click.y >= fieldBorderWidth) && (click.y < fieldCanvas.height - fieldBorderWidth)) {
                    var col = Math.round((click.x - fieldBorderWidth - cellWidth/2) / cellWidth);
                    var row = Math.round((click.y - fieldBorderWidth - cellHeight/2) / cellHeight);
                    field.xorCellIsFill(col, row);
                    field.updateFieldDrawBuffer();
                    field.setAutoFindCombination();
                    drawField();
                }
            }
        }

        var fieldCanvas = document.getElementById(fieldCanvasID);
        var fieldCtx = null;
        if (fieldCanvas) {
            fieldCanvas.width = cellWidth * fieldCols + fieldBorderWidth * 2;
            fieldCanvas.height = cellHeight * fieldRows + fieldBorderWidth * 2;
            fieldCtx = fieldCanvas.getContext("2d");
            drawField();
            drawFieldFrameMode();
        }

        var nextFigureCanvas = document.getElementById(nextFigureCanvasID);
        var nextFigureCtx = null;
        if (nextFigureCanvas) {
            nextFigureCanvas.width =  FIGURE_MAX_CELLS_LENGTH * cellWidth + nextFigureBorderWidth * 2;
            nextFigureCanvas.height = FIGURE_MAX_CELLS_LENGTH * cellHeight + nextFigureBorderWidth * 2;
            nextFigureCtx = nextFigureCanvas.getContext("2d");
            drawNextFigure();
        }

        var gameCycle = function() {
            
            if (field.figureAutoDown(figureDownStepPercent)) {
                drawNextFigure();
            }
            
            drawField();

            var figuresElm = document.getElementById(figuresElmID);
            if (figuresElm) {                
                figuresElm.innerText = field.figuresCount;
                figuresElm.textContent = field.figuresCount; // for firefox
            }

            var scoreElm = document.getElementById(scoreElmID);
            if (scoreElm) {
                scoreElm.innerText = field.score;
                scoreElm.textContent = field.score; // for firefox
            }
            
            var delLinesCountElm = document.getElementById(delLinesCountElmID);
            if (delLinesCountElm) {
                delLinesCountElm.innerText = field.delLinesCount;
                delLinesCountElm.textContent = field.delLinesCount; // for firefox
            }
        };

        var intervalID = null;
        var run = function() {
            if (intervalID == null) {
                intervalID = window.setInterval(gameCycle, gameCycleDelay);
            }
        }

        this.run = run;

        var stop = function() {
            if (intervalID != null) {
                clearInterval(intervalID);
                intervalID = null;
            }
        }

        this.stop = stop;

        this.onKeyDown = function(event) {
            var keyCode;
            if (event == null) {
                keyCode = window.event.keyCode; 
            } else {
               keyCode = event.keyCode; 
            }

            var isAutoMode = field.getIsAutoMode();
            switch (keyCode) {
                case keyCodeMoveLeft:
                    if (!isAutoMode && (intervalID != null))
                        field.figureMoveLeft();
                    break;
                case keyCodeMoveRight:
                    if (!isAutoMode && (intervalID != null))
                        field.figureMoveRight();
                    break;
                case keyCodeRotateRight:
                    if (!isAutoMode && (intervalID != null))
                        field.figureRotateRight();
                    break;
                case keyCodeRotateLeft:
                    if (!isAutoMode && (intervalID != null))
                        field.figureRotateLeft();
                    break;
                case keyCodeFastDown:
                    if (!isAutoMode && (intervalID != null))
                        field.setFigureFastDownMode();
                    break;
                case keyCodeSwitchAutoMode:
                    if (allowSwitchAutoMode && (intervalID != null)) {
                        field.switchAutoMode();
                        drawFieldFrameMode();
                    }
                    break;
                case keyCodePause:
                    if (intervalID == null) {
                        run();
                    } else {
                        stop();
                    }                    
            }
        
        };

    }
    
});
