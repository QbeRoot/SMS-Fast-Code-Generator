@800FA19C # JP
@802865F4 # JP A
@802A6710 # US
@8029E668 # PAL

bl code # jump over the list and store its address in LR

# list of level codes

code:
lis r4, 0x817F

#if timer
	li r0, 0 # set up the timer
	stw r0, 0x010C(r4)
	li r0, 1
	stb r0, 0x0101(r4)
#endif

lbz r0, 0x12(r31)

cmpwi r0, 15 # if going to the title screen, reset the sequence counter and return
bne- 0x10
li r0, # length of the list in bytes, - 2 if random
stw r0, 0(r4)
b done

cmpwi r0, 1 # if not going to the plaza or airstrip, return
bgt- done

lwz r5, TFlagManager::smInstance #-0x6830(r13) on JP, -0x61A0(r13) on JP A, -0x6060(r13) on US, -0x6138(r13) on PAL
mflr r6
lwz r3, 0(r4)

lbz r0, 0x0E(r31) # if coming from the title screen, load next stage
cmpwi r0, 15
beq- 0x10
lbz r0, 0xCC(r5) # else if failed last level, reload it
rlwinm. r0, r0, 0, 25, 25
beq- loadStage

#if random
	addi r3, r3, 2
#endif

cmpwi r3, 0 # if end of list, return
ble- done

#if not ordered
	mftbl r7 # pick random index up to counter
	divwu r0, r7, r3
	mullw r0, r0, r3
	sub r7, r7, r0
	rlwinm r7, r7, 0, 0, 30
#endif

subi r3, r3, 2
#if not random
	stw r3, 0(r4)
#endif

#if not ordered
	lhzx r0, r6, r3 # swap picked level into counter position
	lhzx r4, r6, r7
	sthx r0, r6, r7
	sthx r4, r6, r3
#endif

loadStage:
lhzx r3, r6, r3
sth r3, 0x12(r31)
stb r3, 0xDF(r5)

done:
lwz r3, 0x20(r31) # run replaced instruction