class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 700;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -700;
        this.DOUBLE_JUMP_VELOCITY = -1200;

        this.score = 0; 
        this.newCameraX=0;
        this.newCameraY=0;
        this.heartSpacing = 40; 
        this.healthIcons = []; 
        this.maxHeartHealth=3;

        this.collisionCooldown = 500; // Cooldown time in milliseconds
        this.lastCollisionTime = 0; // Timestamp of the last collision
        this.collisionHandled = false;
        this.playerHealth = 3;
        this.scoreText="";
        this.isGameOver = false;
        this.PARTICLE_VELOCITY = 50;
        this.hasDoubleJumped = false;
        this.hasPlayedJumpSound = false;

    }

    preload() {
        // Load heart image
        this.load.image('heart', 'assets/tile_heart.png');
        this.load.audio('coinSound', 'assets/impactMetal_medium_004.ogg');
        this.load.audio('backgroundSound', 'assets/computerNoise_003.ogg');
        this.load.audio('jumpingSound', 'assets/impactPlank_medium_002.ogg');
        this.load.audio('gameOverSound', 'assets/powerUp11.ogg');

    }

    create() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight; 

        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 300, 60);

        // Add a tileset to the map
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        this.groundLayer.setScale(0.5);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        
        this.backgroundSound = this.sound.add('backgroundSound', {
            loop: true,
            volume: 0.3
        });
        this.backgroundSound.play();
        

        this.key = this.map.createFromObjects("Objects", {
            name: "key",
            key: "tilemap_sheet",
            frame: 27
        });
        this.physics.world.enable(this.key, Phaser.Physics.Arcade.STATIC_BODY);

        this.keyGroup = this.add.group(this.key);


        my.sprite.player = this.physics.add.sprite(10, game.config.height - 10, "platformer_characters", "tile_0001.png").setScale(SCALE);
        my.sprite.player.setCollideWorldBounds(true);


        this.physics.add.collider(my.sprite.player, this.groundLayer);

        this.physics.add.overlap(my.sprite.player, this.keyGroup, (obj1, obj2) => {
            this.collectCoin(my.sprite.player, this.tile);
            obj2.destroy(); 
        });



        const mapWidth = this.map.widthInPixels;
        const mapHeight = this.map.heightInPixels;

        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

       

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // Set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        // Debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = !this.physics.world.drawDebug;
        }, this);

        this.groundLayer.setScale(1.0);

        // Set the camera bounds to match the size of the map
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player);

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['scratch_01.png', 'scratch_01.png'],
            scale: {start: 0.04, end: 0.1},
            lifespan: 200,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.jumping = this.add.particles(0, 0, "kenny-particles", {
            frame: ['flame_04.png', 'flame_05.png'],
            scale: {start: 0.03, end: 0.1},
            lifespan: 300,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();
        my.vfx.jumping.stop();

        window.scrollTo(0, document.body.scrollHeight);

        // Adjust the spacing between hearts
        this.hearts = this.add.group();

        this.createHealthIcons();
    }

    update() {
        if (cursors.left.isDown) {
            my.sprite.player.body.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            this.hasPlayedJumpSound = false;
        } else if (cursors.right.isDown) {
       
            my.sprite.player.body.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);

            my.vfx.walking.stop();
            my.vfx.jumping.stop();
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            this.hasPlayedJumpSound = false;
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.jumping.stop();
                my.vfx.walking.start();

            }
        } else {
            my.sprite.player.body.setAccelerationX(0);
            my.sprite.player.body.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            this.hasPlayedJumpSound = false;
            my.vfx.walking.stop();
            my.vfx.jumping.stop();
        }

           
        if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
            if (my.sprite.player.body.blocked.down) {
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
                my.vfx.jumping.start();
                if (!this.hasPlayedJumpSound) {
                    this.explosionSound = this.sound.add('jumpingSound');
                    this.explosionSound.play(); 
                    this.hasPlayedJumpSound = true;
                }  
                this.hasDoubleJumped = false;
            } else if (!this.hasDoubleJumped) {
                my.sprite.player.body.setVelocityY(this.DOUBLE_JUMP_VELOCITY);
                my.vfx.jumping.start();
               
            }
        }

        if (!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
            my.vfx.jumping.start();
 
            my.vfx.jumping.startFollow(my.sprite.player, 0, 0);
            my.vfx.walking.stop();
        }
        if (my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            
        }

        this.physics.overlap(my.sprite.player, this.groundLayer, this.handlePlayerCollision, null, this);

          
        this.updateHealthIcons();
    
    }

    createHealthIcons() {

        const heartY = this.cameras.main.scrollY + this.cameras.main.height - 25; // Fixed Y position at the bottom of the screen
        const heartXBase = this.cameras.main.scrollX + 20; 

        for (let i = 0; i < this.maxHeartHealth; i++) {
            const heart = this.add.sprite(heartXBase + i * (this.heartSpacing + 16), heartY, 'heart').setOrigin(0, 0.5);
            heart.setScale(0.7);
            this.healthIcons.push(heart);
        }

        this.scoreText = this.add.text(heartXBase+10, heartY, 'Score : '+ this.score, { fontSize: '36px', fill: '#fff' }).setOrigin(0,0.5);
        this.scoreText.setScale(0.7);
    }


    updateHealthIcons() {

        const currentTime = this.time.now; // Get the current time
        
        const heartY = this.cameras.main.scrollY + this.cameras.main.height - 25; // Fixed Y position at the bottom of the screen
        const heartX = this.cameras.main.scrollX + 20; // Adjust X position to start a bit from the left
     
        for (let i = 0; i < this.maxHeartHealth; i++) {

            if (i < this.playerHealth) {
                    this.healthIcons[i].setVisible(true);
                    this.healthIcons[i].x = heartX + i * (this.heartSpacing + 16);
                    this.healthIcons[i].y = heartY;
            } else {
                    this.healthIcons[i].setVisible(false);
            }
            
        }
        this.scoreText.setText('Score: ' + this.score);
        this.scoreText.x = heartX+10;
        this.scoreText.y = heartY-30;

        if (this.playerHealth <= 0 && !this.isGameOver )
            {
                this.gameOver();
        }
    }

    
    handlePlayerCollision(player, tile) {
            
            if (this.isGameOver) {
                return; 
            }
            if (tile.index === 28) {

                this.collectCoin(player, tile);
                
            } else if (tile.index === 34 || tile.index === 54) {
                if(!this.collisionHandled){
                    this.time.delayedCall(1000, () => { // Reset the collision flag after a short delay
                        this.collisionHandled = false;
                    }, [], this);
                    this.collisionHandled = true;
                    this.playerHealth--;
                    this.updateHealthIcons();
                }    
            } else if (tile.index === 112 || tile.index === 132) {
                this.map.removeTileAt(tile.x, tile.y, this.groundLayer);
                this.completedLevel();
            }
            else if (tile.index === 68) {
                
                this.explosionSound = this.sound.add('coinSound');
                this.explosionSound.play();
                this.map.removeTileAt(tile.x, tile.y, this.groundLayer);
                this.playerHealth++;
                this.updateHealthIcons();
            }
            else if (tile.index === 146) {
                if(!this.collisionHandled){
                    this.time.delayedCall(2000, () => { // Reset the collision flag after a short delay
                        this.collisionHandled = false;
                    }, [], this);
                    this.collisionHandled = true;
                    this.playerHealth--;
                    this.updateHealthIcons();
                }    
            }
    }

    collectCoin(player, tile) {
        this.explosionSound = this.sound.add('coinSound');
        this.explosionSound.play();
        this.score += 10; 
    }

    completedLevel() {
        const messageX = my.sprite.player.x-150;
        const messageY = this.cameras.main.height - 150;
        this.backgroundSound.stop();
        this.explosionSound = this.sound.add('gameOverSound');
        this.explosionSound.setVolume(0.5);
        this.explosionSound.play();

        const message = this.add.text(messageX, messageY, 'Completed Level 1', { fontSize: '36px', fill: '#fff' });
        message.setOrigin(0.5);

        this.physics.pause();
        this.input.keyboard.enabled = false;

        this.resetgame(100,100);
    }

    gameOver() {
        
        this.isGameOver = true;

        const messageX = my.sprite.player.x;
        const messageY = this.cameras.main.height - 150;
        
        this.backgroundSound.stop();
        this.explosionSound = this.sound.add('gameOverSound');
        this.explosionSound.setVolume(0.5);
        this.explosionSound.play();
        const message = this.add.text(messageX, messageY, 'Game Over', { fontSize: '36px', fill: '#fff' });
        message.setOrigin(0.5);

        this.physics.pause();
        this.input.keyboard.enabled = false;

        

        this.resetgame(0,100);
    }

    resetgame(x,y) {
        const messageX = my.sprite.player.x-x;
        const messageY = this.cameras.main.height - y;

        const restartButton = this.add.text(messageX, messageY, 'Restart', { fontSize: '24px', fill: '#fff' })
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.restart();
                this.input.keyboard.enabled = true;
                this.init();
            });
    }
}
